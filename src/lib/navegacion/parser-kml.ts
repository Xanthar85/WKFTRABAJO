// src/lib/navegacion/parser-kml.ts
// WKF — Parser de KML (F4 — Importar).
// Lee un XML de KML y devuelve las capas con sus elementos
// (puntos, líneas y polígonos). No toca IndexedDB: eso lo hace
// el store.
//
// Estructura de KML:
//   <kml><Document>
//     <Folder><name>Capa A</name>
//       <Placemark>
//         <name>Nombre</name>
//         <description>...</description>
//         <styleUrl>#estilo1</styleUrl>
//         <Point><coordinates>lon,lat,alt</coordinates></Point>
//         o <LineString><coordinates>...</coordinates></LineString>
//         o <Polygon><outerBoundaryIs><LinearRing>
//             <coordinates>...</coordinates>
//           </LinearRing></outerBoundaryIs></Polygon>
//       </Placemark>
//     </Folder>
//     <Style id="estilo1">
//       <IconStyle><color>aabbggrr</color></IconStyle>
//       <LineStyle><color>aabbggrr</color><width>2</width></LineStyle>
//       <PolyStyle><color>aabbggrr</color></PolyStyle>
//     </Style>
//   </Document></kml>
//
// Colores KML: AABBGGRR (alfa, azul, verde, rojo) en hexadecimal.
// Los pasamos a #RRGGBB y descartamos el alfa (los elementos
// llevan su propia opacidad en el estilo de WKF).

import type {
  Capa,
  ElementoCapa,
  EstiloElemento,
  TipoElemento,
} from '../../db/capas-repo.ts';

export interface ResultadoKML {
  capas: Omit<Capa, 'id'>[];
}

function leerTextoDirecto(el: Element, nombre: string): string | null {
  for (let i = 0; i < el.children.length; i++) {
    const hijo = el.children[i];
    const local = hijo.localName ?? hijo.nodeName;
    if (local === nombre) {
      const t = hijo.textContent;
      if (t != null && t.trim() !== '') return t.trim();
    }
  }
  return null;
}

function leerHijo(el: Element, nombre: string): Element | null {
  for (let i = 0; i < el.children.length; i++) {
    const hijo = el.children[i];
    const local = hijo.localName ?? hijo.nodeName;
    if (local === nombre) return hijo;
  }
  return null;
}

// KML usa "lon,lat,alt" separados por espacios. Devolvemos [lat, lon].
function parsearCoordenadas(texto: string): [number, number][] {
  const out: [number, number][] = [];
  const trozos = texto.trim().split(/\s+/);
  for (const t of trozos) {
    if (t === '') continue;
    const partes = t.split(',');
    if (partes.length < 2) continue;
    const lon = parseFloat(partes[0]);
    const lat = parseFloat(partes[1]);
    if (!Number.isFinite(lat) || !Number.isFinite(lon)) continue;
    if (lat < -90 || lat > 90) continue;
    if (lon < -180 || lon > 180) continue;
    out.push([lat, lon]);
  }
  return out;
}

// Colores KML: "aabbggrr" en hex. Devolvemos "#rrggbb" o undefined
// si no podemos parsearlo.
function colorKMLAHex(kml: string | null): string | undefined {
  if (!kml) return undefined;
  const limpio = kml.trim().replace(/^#/, '');
  if (limpio.length !== 8) return undefined;
  const bb = limpio.slice(2, 4);
  const gg = limpio.slice(4, 6);
  const rr = limpio.slice(6, 8);
  if (!/^[0-9a-fA-F]{2}$/.test(rr)) return undefined;
  if (!/^[0-9a-fA-F]{2}$/.test(gg)) return undefined;
  if (!/^[0-9a-fA-F]{2}$/.test(bb)) return undefined;
  return `#${rr}${gg}${bb}`;
}

interface EstilosMap {
  [id: string]: EstiloElemento;
}

// Recoge todos los <Style> del documento. La clave es el id del
// estilo, que luego se referencia con styleUrl="#id".
function recogerEstilos(doc: Document): EstilosMap {
  const out: EstilosMap = {};
  const todos = doc.getElementsByTagName('*');
  for (let i = 0; i < todos.length; i++) {
    const el = todos[i];
    const local = el.localName ?? el.nodeName;
    if (local !== 'Style') continue;
    const id = el.getAttribute('id');
    if (!id) continue;

    const estilo: EstiloElemento = {};

    const iconStyle = leerHijo(el, 'IconStyle');
    if (iconStyle) {
      const color = leerTextoDirecto(iconStyle, 'color');
      const hex = colorKMLAHex(color);
      if (hex) estilo.color = hex;
    }

    const lineStyle = leerHijo(el, 'LineStyle');
    if (lineStyle) {
      const color = leerTextoDirecto(lineStyle, 'color');
      const hex = colorKMLAHex(color);
      if (hex) estilo.color = hex;
      const width = leerTextoDirecto(lineStyle, 'width');
      if (width != null) {
        const w = parseFloat(width);
        if (Number.isFinite(w) && w > 0) estilo.grosor = w;
      }
    }

    const polyStyle = leerHijo(el, 'PolyStyle');
    if (polyStyle) {
      const color = leerTextoDirecto(polyStyle, 'color');
      const hex = colorKMLAHex(color);
      if (hex) estilo.relleno = hex;
    }

    out[id] = estilo;
  }
  return out;
}

function estiloDePlacemark(el: Element, estilos: EstilosMap): EstiloElemento | undefined {
  const styleUrl = leerTextoDirecto(el, 'styleUrl');
  if (!styleUrl) return undefined;
  const limpio = styleUrl.replace(/^#/, '');
  return estilos[limpio];
}

function parsearPlacemark(
  el: Element,
  estilos: EstilosMap,
  indice: number
): ElementoCapa | null {
  const nombre = leerTextoDirecto(el, 'name') ?? undefined;
  const descripcion = leerTextoDirecto(el, 'description') ?? undefined;
  const estilo = estiloDePlacemark(el, estilos);

  // Punto
  const point = leerHijo(el, 'Point');
  if (point) {
    const coordTexto = leerTextoDirecto(point, 'coordinates');
    if (coordTexto) {
      const coords = parsearCoordenadas(coordTexto);
      if (coords.length >= 1) {
        return {
          id: `kml-el-${indice}`,
          tipo: 'punto' as TipoElemento,
          coords: coords[0],
          nombre,
          descripcion,
          estilo,
        };
      }
    }
  }

  // Línea
  const line = leerHijo(el, 'LineString');
  if (line) {
    const coordTexto = leerTextoDirecto(line, 'coordinates');
    if (coordTexto) {
      const coords = parsearCoordenadas(coordTexto);
      if (coords.length >= 2) {
        return {
          id: `kml-el-${indice}`,
          tipo: 'linea' as TipoElemento,
          coords,
          nombre,
          descripcion,
          estilo,
        };
      }
    }
  }

  // Polígono (solo el anillo exterior; los agujeros se ignoran).
  const poly = leerHijo(el, 'Polygon');
  if (poly) {
    const outer = leerHijo(poly, 'outerBoundaryIs');
    if (outer) {
      const ring = leerHijo(outer, 'LinearRing');
      if (ring) {
        const coordTexto = leerTextoDirecto(ring, 'coordinates');
        if (coordTexto) {
          const coords = parsearCoordenadas(coordTexto);
          if (coords.length >= 3) {
            return {
              id: `kml-el-${indice}`,
              tipo: 'poligono' as TipoElemento,
              coords,
              nombre,
              descripcion,
              estilo,
            };
          }
        }
      }
    }
  }

  // MultiGeometry: recorremos los hijos y devolvemos el primer
  // elemento válido. Los KMZ del usuario no suelen tener
  // multigeometrías complejas.
  const multi = leerHijo(el, 'MultiGeometry');
  if (multi) {
    for (let i = 0; i < multi.children.length; i++) {
      const hijo = multi.children[i];
      const local = hijo.localName ?? hijo.nodeName;
      if (local === 'Point' || local === 'LineString' || local === 'Polygon') {
        const fake = document.implementation.createDocument(
          null,
          null,
          null
        );
        const wrapper = fake.createElement('Placemark');
        wrapper.appendChild(hijo.cloneNode(true));
        const el2 = wrapper.children[0];
        const result = parsearPlacemark(
          (() => {
            const contenedor = fake.createElement('Placemark');
            if (nombre) {
              const n = fake.createElement('name');
              n.textContent = nombre;
              contenedor.appendChild(n);
            }
            if (descripcion) {
              const d = fake.createElement('description');
              d.textContent = descripcion;
              contenedor.appendChild(d);
            }
            contenedor.appendChild(el2.cloneNode(true));
            return contenedor;
          })(),
          estilos,
          indice
        );
        if (result) return result;
      }
    }
  }

  return null;
}

// Recorre los <Folder> y <Document> del KML. Cada Folder es una
// capa. Los Placemark que están sueltos en el Document van a una
// capa por defecto llamada "Capa importada".
function construirCapas(
  doc: Document,
  estilos: EstilosMap
): Omit<Capa, 'id'>[] {
  const capas: Omit<Capa, 'id'>[] = [];
  let contadorElementos = 1;

  // Recorre un elemento (Folder o Document) y devuelve sus
  // Placemark DIRECTOS (sin bajar a sub-Folder). Los sub-Folders
  // se procesan aparte.
  function placemarksDirectos(padre: Element): Element[] {
    const out: Element[] = [];
    for (let i = 0; i < padre.children.length; i++) {
      const hijo = padre.children[i];
      const local = hijo.localName ?? hijo.nodeName;
      if (local === 'Placemark') out.push(hijo);
    }
    return out;
  }

  // Devuelve los sub-Folders DIRECTOS de un elemento.
  function subFoldersDirectos(padre: Element): Element[] {
    const out: Element[] = [];
    for (let i = 0; i < padre.children.length; i++) {
      const hijo = padre.children[i];
      const local = hijo.localName ?? hijo.nodeName;
      if (local === 'Folder') out.push(hijo);
    }
    return out;
  }

  // Procesa un Folder: crea una capa con sus Placemark directos
  // y luego procesa recursivamente los sub-Folders.
  function procesarFolder(folder: Element): void {
    const nombreCapa =
      leerTextoDirecto(folder, 'name') ?? `Capa ${capas.length + 1}`;

    const elementos: ElementoCapa[] = [];
    for (const p of placemarksDirectos(folder)) {
      const elem = parsearPlacemark(p, estilos, contadorElementos);
      if (elem) {
        elementos.push(elem);
        contadorElementos++;
      }
    }

    if (elementos.length > 0) {
      capas.push({
        nombre: nombreCapa,
        visible: true,
        elementos,
      });
    }

    for (const sub of subFoldersDirectos(folder)) {
      procesarFolder(sub);
    }
  }

  // Empezamos desde el elemento raíz del documento. Si el root es
  // <kml>, buscamos su <Document>. Si el root ya es <Document>,
  // vamos directos.
  const root = doc.documentElement;
  if (!root) return capas;

  let documento: Element | null = null;
  if ((root.localName ?? root.nodeName) === 'Document') {
    documento = root;
  } else {
    for (let i = 0; i < root.children.length; i++) {
      const hijo = root.children[i];
      const local = hijo.localName ?? hijo.nodeName;
      if (local === 'Document') {
        documento = hijo;
        break;
      }
    }
  }

  if (!documento) {
    // Sin Document: intentamos procesar el root como si fuera un
    // Folder implícito.
    const elementos: ElementoCapa[] = [];
    for (const p of placemarksDirectos(root)) {
      const elem = parsearPlacemark(p, estilos, contadorElementos);
      if (elem) {
        elementos.push(elem);
        contadorElementos++;
      }
    }
    if (elementos.length > 0) {
      capas.push({
        nombre: 'Capa importada',
        visible: true,
        elementos,
      });
    }
    return capas;
  }

  // Placemarks sueltos directamente en el Document (sin Folder)
  // van a una capa "Capa importada".
  const sueltos: ElementoCapa[] = [];
  for (const p of placemarksDirectos(documento)) {
    const elem = parsearPlacemark(p, estilos, contadorElementos);
    if (elem) {
      sueltos.push(elem);
      contadorElementos++;
    }
  }
  if (sueltos.length > 0) {
    capas.push({
      nombre: 'Capa importada',
      visible: true,
      elementos: sueltos,
    });
  }

  // Folders directos del Document.
  for (const folder of subFoldersDirectos(documento)) {
    procesarFolder(folder);
  }

  return capas;
}

export function parsearKML(contenido: string): ResultadoKML {
  const parser = new DOMParser();
  const doc = parser.parseFromString(contenido, 'application/xml');

  const errores = doc.getElementsByTagName('parsererror');
  if (errores.length > 0) {
    throw new Error('KML mal formado');
  }

  const estilos = recogerEstilos(doc);
  const capas = construirCapas(doc, estilos);

  return { capas };
}