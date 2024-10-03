// Función para cargar los datos
async function loadData(url) {
    try {
        const response = await fetch(url);
        if (!response.ok) {
            throw new Error(`Error HTTP! Estado: ${response.status}`);
        }
        const data = await response.json();
        return data;
    } catch (error) {
        console.error(`Error cargando datos de ${url}:`, error);
        return null;
    }
}

// Función para dibujar gráficos concatenados para LINIA COMPLETA
async function drawFullLinePlot(trams, resumData) {
    // Limpiar el contenedor de gráficos y añadir el título global
    document.getElementById('plot').innerHTML = `
        <h2 style="text-align: center; font-size: 24px; font-family: Arial, sans-serif; margin-bottom: 20px;">
            Espai-temps previsió rehabilitació de la línia completa
        </h2>`;

    const estacionsUrl = 'https://raw.githubusercontent.com/cvazquezfgc/planificacio-renovacio-via/main/estacions.json';
    const estacionsData = await loadData(estacionsUrl);
    if (!estacionsData) {
        console.error('No se pudo cargar los datos de las estaciones.');
        return;
    }

    // Definir altura unitaria por kilómetro
    const unitHeightPerKm = 50; // La mitad del alto de los botones de tramo (~50px)

    // Dibujar los gráficos concatenados de cada tramo
    for (let i = 0; i < trams.length; i++) {
        const tram = trams[i];

        // Obtener los datos de Vía 1 y Vía 2 para el tramo actual
        const via1Data = resumData.filter(d => parseInt(d.Via) === 1 && d.TRAM === tram);
        const via2Data = resumData.filter(d => parseInt(d.Via) === 2 && d.TRAM === tram);

        // Calcular PK mínimo y máximo del tramo
        const pkMin = Math.min(...via1Data.concat(via2Data).map(d => parseFloat(d['PK inici'])));
        const pkMax = Math.max(...via1Data.concat(via2Data).map(d => parseFloat(d['PK final'])));
        const tramoHeight = (pkMax - pkMin) * unitHeightPerKm;

        // Crear un contenedor para cada gráfico
        const container = document.createElement('div');
        container.id = `plot-${tram}`;
        container.style.display = 'flex';
        container.style.alignItems = 'center';
        container.style.marginBottom = '20px';

        // Crear un contenedor para la etiqueta del tramo
        const labelContainer = document.createElement('div');
        labelContainer.style.transform = 'rotate(270deg)'; // Cambiar orientación del texto a 270 grados
        labelContainer.style.textAlign = 'center';
        labelContainer.style.marginRight = '10px';
        labelContainer.style.fontSize = '16px';
        labelContainer.style.fontWeight = 'bold';
        labelContainer.style.whiteSpace = 'nowrap'; // Evitar que el texto se divida en varias líneas
        labelContainer.textContent = tram;

        // Crear un contenedor para el gráfico
        const plotContainer = document.createElement('div');
        plotContainer.id = `plot-${tram}-chart`;
        plotContainer.style.height = `${tramoHeight}px`; // Ajustar la altura proporcional a la longitud del tramo
        plotContainer.style.flexGrow = '1';

        // Añadir la etiqueta y el gráfico al contenedor principal
        container.appendChild(labelContainer);
        container.appendChild(plotContainer);

        // Añadir el contenedor del gráfico al área principal de gráficos
        document.getElementById('plot').appendChild(container);

        // Dibujar el gráfico sin título y con etiquetas de año solo en el último gráfico
        const addHorizontalLabels = i === trams.length - 1;
        await drawPlot(tram, resumData, estacionsData, plotContainer.id, addHorizontalLabels, pkMin, pkMax, tramoHeight);
    }

    // Añadir un espacio en blanco al final de la página para evitar que quede muy ajustada
    const blankSpace = document.createElement('div');
    blankSpace.style.height = '100px';
    document.getElementById('plot').appendChild(blankSpace);

    // Habilitar desplazamiento en la página LINIA COMPLETA
    document.body.style.height = 'auto';
    document.body.style.overflow = 'auto';
}

// Función para dibujar gráficos de tramos individuales y añadir representación visual de las tarjetas informativas
async function drawSinglePlot(tram, resumData) {
    // Limpiar el contenedor de gráficos y añadir el título del gráfico
    document.getElementById('plot').innerHTML = `
        <h2 style="text-align: center; font-size: 24px; font-family: Arial, sans-serif; margin: 20px 0;">
            Espai-temps previsió rehabilitació tram ${tram}
        </h2>`;

    const estacionsUrl = 'https://raw.githubusercontent.com/cvazquezfgc/planificacio-renovacio-via/main/estacions.json';
    const estacionsData = await loadData(estacionsUrl);
    if (!estacionsData) {
        console.error('No se pudo cargar los datos de las estaciones.');
        return;
    }

    await drawPlot(tram, resumData, estacionsData, 'plot', true, null, null, 400); // Ajustar la altura de los gráficos individuales

    // Añadir la representación visual de las tarjetas informativas
    const infoContainer = document.createElement('div');
    infoContainer.style.display = 'flex';
    infoContainer.style.gap = '20px';
    infoContainer.style.marginTop = '20px';

    const createLineRepresentation = (title, segments, color) => {
        const representation = document.createElement('div');
        representation.style.flex = '1';
        representation.style.textAlign = 'center';

        const lineTitle = document.createElement('h3');
        lineTitle.textContent = title;
        lineTitle.style.marginBottom = '10px';

        const lineContainer = document.createElement('div');
        lineContainer.style.position = 'relative';
        lineContainer.style.height = '40px';
        lineContainer.style.margin = '10px 0';

        ['Vía 1', 'Vía 2'].forEach((via, index) => {
            const line = document.createElement('div');
            line.style.position = 'absolute';
            line.style.top = `${index * 20}px`;
            line.style.left = '0';
            line.style.width = '100%';
            line.style.height = '10px';
            line.style.borderRadius = '5px';
            line.style.backgroundColor = color;

            // Colorear los segmentos si es necesario
            segments
                .filter(seg => seg.via === via)
                .forEach(segment => {
                    const segmentDiv = document.createElement('div');
                    segmentDiv.style.position = 'absolute';
                    segmentDiv.style.left = `${((segment.PKInici / totalLength) * 100).toFixed(2)}%`;
                                        segmentDiv.style.width = `${(((segment.PKFinal - segment.PKInici) / totalLength) * 100).toFixed(2)}%`;
                    segmentDiv.style.height = '10px';
                    segmentDiv.style.borderRadius = '5px';
                    segmentDiv.style.backgroundColor = segment.color; // Resaltar el segmento con el color correspondiente
                    line.appendChild(segmentDiv);
                });

            lineContainer.appendChild(line);
        });

        representation.appendChild(lineTitle);
        representation.appendChild(lineContainer);

        return representation;
    };

    const totalLength = resumData
        .filter(d => d.TRAM === tram)
        .reduce((sum, d) => sum + (parseFloat(d['PK final']) - parseFloat(d['PK inici'])) * 1000, 0);

    // Crear representaciones para las tres zonas (todas las vías, rehabilitación < 2025, rehabilitación entre 2025 y 2030)
    const viaSegments = resumData.filter(d => d.TRAM === tram).map(d => ({
        PKInici: parseFloat(d['PK inici']),
        PKFinal: parseFloat(d['PK final']),
        via: `Vía ${d.Via}`,
        color: 'gray'
    }));

    const segmentsBefore2025 = resumData
        .filter(d => d.TRAM === tram && parseInt(d['PREVISIÓ REHABILITACIÓ']) < 2025)
        .map(d => ({
            PKInici: parseFloat(d['PK inici']),
            PKFinal: parseFloat(d['PK final']),
            via: `Vía ${d.Via}`,
            color: 'red'
        }));

    const segmentsBetween2025And2030 = resumData
        .filter(d => d.TRAM === tram && parseInt(d['PREVISIÓ REHABILITACIÓ']) >= 2025 && parseInt(d['PREVISIÓ REHABILITACIÓ']) <= 2030)
        .map(d => ({
            PKInici: parseFloat(d['PK inici']),
            PKFinal: parseFloat(d['PK final']),
            via: `Vía ${d.Via}`,
            color: 'orange'
        }));

    // Añadir representaciones gráficas al contenedor
    infoContainer.appendChild(createLineRepresentation('LONGITUD TOTAL DE VIA DEL TRAMO', viaSegments, 'gray'));
    infoContainer.appendChild(createLineRepresentation('LONGITUD TOTAL DE VIA DEL TRAMO CON AÑO DE REHABILITACIÓN < 2025', segmentsBefore2025, 'gray'));
    infoContainer.appendChild(createLineRepresentation('LONGITUD TOTAL DE VIA DEL TRAMO CON AÑO DE REHABILITACIÓN ENTRE 2025 Y 2030', segmentsBetween2025And2030.concat(segmentsBefore2025), 'gray'));

    // Añadir el contenedor de la información al gráfico principal
    document.getElementById('plot').appendChild(infoContainer);
}

// Función para dibujar un gráfico específico
async function drawPlot(tram, resumData, estacionsData, containerId = 'plot', addHorizontalLabels = false, pkMinGlobal = null, pkMaxGlobal = null, plotHeight = 500) {
    let traces = [];
    let stationAnnotations = [];
    let shapes = [];

    let pkMin = Infinity;
    let pkMax = -Infinity;

    function groupConsecutiveSegments(data) {
        const groupedData = [];
        let currentGroup = null;

        data.forEach(segment => {
            const pkInici = parseFloat(segment['PK inici']);
            const pkFinal = parseFloat(segment['PK final']);
            const previsio = segment['PREVISIÓ REHABILITACIÓ'];

            if (currentGroup && currentGroup.PKFinal === pkInici && currentGroup.PREVISIO === previsio && currentGroup.via === segment.Via) {
                currentGroup.PKFinal = pkFinal;
                currentGroup.length += (pkFinal - pkInici) * 1000;
            } else {
                if (currentGroup) {
                    groupedData.push(currentGroup);
                }
                currentGroup = {
                    PKInici: pkInici,
                    PKFinal: pkFinal,
                    PREVISIO: previsio,
                    length: (pkFinal - pkInici) * 1000,
                    via: segment.Via
                };
            }
        });

        if (currentGroup) {
            groupedData.push(currentGroup);
        }

        return groupedData;
    }

    const via1Data = resumData.filter(d => parseInt(d.Via) === 1 && d.TRAM === tram);
    const via2Data = resumData.filter(d => parseInt(d.Via) === 2 && d.TRAM === tram);

    const via1 = groupConsecutiveSegments(via1Data);
    const via2 = groupConsecutiveSegments(via2Data);

    if (via1.length > 0 || via2.length > 0) {
        pkMin = Math.min(...via1.concat(via2).map(d => d.PKInici));
        pkMax = Math.max(...via1.concat(via2).map(d => d.PKFinal));

        if (pkMinGlobal !== null) pkMin = pkMinGlobal;
        if (pkMaxGlobal !== null) pkMax = pkMaxGlobal;

        traces.push({
            x: via1.map(d => d.PREVISIO),
            y: via1.map(d => d.PKFinal - d.PKInici),
            base: via1.map(d => d.PKInici),
            type: 'bar',
            name: 'Vía 1',
            orientation: 'v',
            width: 0.5,
            offset: 0,
            marker: {
                color: 'rgba(31, 119, 180, 1)'
            },
            hoverinfo: 'text',
            hovertext: via1.map(d => `${Math.round(d.length)} m`),
            hoverlabel: {
                bgcolor: 'rgba(31, 119, 180, 1)',
                font: {
                    color: 'white'
                }
            }
        });

        traces.push({
            x: via2.map(d => d.PREVISIO),
            y: via2.map(d => d.PKFinal - d.PKInici),
            base: via2.map(d => d.PKInici),
            type: 'bar',
            name: 'Vía 2',
            orientation: 'v',
            width: 0.5,
            offset: 0.5,
            marker: {
                color: 'rgba(255, 127, 14, 1)'
            },
            hoverinfo: 'text',
            hovertext: via2.map(d => `${Math.round(d.length)} m`),
            hoverlabel: {
                bgcolor: 'rgba(255, 127, 14, 1)',
                font: {
                    color: 'white'
                }
            }
        });

        // Añadir anotaciones y líneas de referencia para las estaciones
        const estaciones = estacionsData.filter(d => d.Tram === tram);

        stationAnnotations.push(...estaciones.map(d => ({
            x: 2069,
            y: parseFloat(d['PK']),
            text: `<b>${d['Abreviatura']}</b>`,
            showarrow: false,
            font: {
                color: 'black',
                size: 14,
                family: 'Arial, sans-serif'
            },
            xanchor: 'left',
            yanchor: 'middle',
            bgcolor: 'white',
            bordercolor: 'gray',
            borderwidth: 2,
            borderpad: 5,
            opacity: 1
        })));

        shapes.push(...estaciones.map(d => ({
            type: 'line',
            x0: 1995,
            x1: 2069,
            y0: parseFloat(d['PK']),
            y1: parseFloat(d['PK']),
            line: {
                color: 'darkgray',
                width: 1.5,
                layer: 'below'
            }
        })));

        // Añadir líneas y sombreado para los años y la línea roja para 2025
        shapes = shapes.concat(addLinesAndShading(pkMin, pkMax));
    }

    // Configuración del layout del gráfico
    const layout = {
        title: addHorizontalLabels ? '' : `Espai-temps previsió rehabilitació del tram ${tram}`,
        xaxis: {
            title: addHorizontalLabels ? 'Any previsió rehabilitació' : '',
            range: [1995, 2070],
            tickvals: Array.from({ length: 75 }, (_, i) => 1995 + i).filter(year => year % 5 === 0),
            tickangle: addHorizontalLabels ? -45 : 0,
            showticklabels: addHorizontalLabels
        },
        yaxis: {
            title: 'PK',
            autorange: 'reversed',
            range: [pkMax, pkMin],
            tickvals: Array.from({ length: Math.ceil(pkMax - pkMin + 1) }, (_, i) => Math.floor(pkMin) + i),
            ticktext: Array.from({ length: Math.ceil(pkMax - pkMin + 1) }, (_, i) => `${Math.floor(pkMin) + i}+000`)
        },
        showlegend: true,
        legend: {
            orientation: 'v',
            x: 1.05,
            xanchor: 'left',
            y: 1
        },
        annotations: stationAnnotations,
        shapes: shapes,
        hovermode: 'closest',
        margin: {
            l: 150,
            r: 150,
            t: 20,
            b: addHorizontalLabels ? 50 : 20
        },
        height: plotHeight // Ajustar la altura del gráfico
    };

    // Dibujar la gráfica
        Plotly.newPlot(containerId, traces, layout);
}

// Función para añadir líneas y sombreado
function addLinesAndShading(pkMin, pkMax) {
    let shapes = [];
    for (let year = 1995; year <= 2069; year++) {
        // Añadir líneas verticales para cada año
        shapes.push({
            type: 'line',
            x0: year,
            x1: year,
            y0: pkMin,
            y1: pkMax,
            line: {
                color: 'lightgray',
                width: 0.8,
                layer: 'below'
            }
        });

        // Añadir sombreado cada 5 años
        if (year % 5 === 0) {
            shapes.push({
                type: 'rect',
                x0: year,
                x1: year + 1,
                y0: pkMin,
                y1: pkMax,
                fillcolor: 'rgba(211, 211, 211, 0.3)',
                layer: 'below',
                line: {
                    width: 0
                }
            });
        }
    }

    // Añadir sombreado rojo antes de 2025
    shapes.push({
        type: 'rect',
        x0: 1995,
        x1: 2025,
        y0: pkMin,
        y1: pkMax,
        fillcolor: 'rgba(255, 0, 0, 0.1)',
        layer: 'below',
        line: {
            width: 0
        }
    });

    // Añadir línea roja en 2025
    shapes.push({
        type: 'line',
        x0: 2025,
        x1: 2025,
        y0: pkMin,
        y1: pkMax,
        line: {
            color: 'red',
            width: 2,
            layer: 'above'
        }
    });

    return shapes;
}

// Inicializar la página y los eventos
async function init() {
    const resumUrl = 'https://raw.githubusercontent.com/cvazquezfgc/planificacio-renovacio-via/main/resum.json';
    const resumData = await loadData(resumUrl);
    if (!resumData) {
        console.error('No se pudo cargar el resumen de datos.');
        return;
    }

    const trams = [...new Set(resumData.map(d => d.TRAM))];
    if (trams.length === 0) {
        console.error('No se encontraron tramos en los datos cargados.');
        return;
    }

    const tramButtonsContainer = document.getElementById('tramButtons');
    if (!tramButtonsContainer) {
        console.error('No se encontró el contenedor de botones de tramo en el DOM.');
        return;
    }

    // Añadir el botón para "LINIA COMPLETA"
    const liniaCompletaButton = document.createElement('button');
    liniaCompletaButton.className = 'tram-button';
    liniaCompletaButton.textContent = 'LINIA COMPLETA';
    liniaCompletaButton.style.marginLeft = '20px'; // Añadir margen a la derecha para separar del resto de botones
    liniaCompletaButton.addEventListener('click', () => {
        selectTramButton(liniaCompletaButton);
        drawFullLinePlot(trams, resumData);
    });

    // Crear una línea divisoria entre los botones de tramos y el botón de LINIA COMPLETA
    const separator = document.createElement('div');
    separator.style.borderLeft = '2px solid #ccc';
    separator.style.height = '30px';
    separator.style.marginLeft = '10px';
    separator.style.marginRight = '10px';

    // Añadir botones de cada tramo
    trams.forEach(tram => {
        if (tram) {
            const button = document.createElement('button');
            button.className = 'tram-button';
            button.textContent = tram;
            button.addEventListener('click', () => {
                selectTramButton(button);
                drawSinglePlot(tram, resumData);
            });
            tramButtonsContainer.appendChild(button);
        }
    });

    // Añadir la línea divisoria y el botón de LINIA COMPLETA al contenedor de botones
    tramButtonsContainer.appendChild(separator);
    tramButtonsContainer.appendChild(liniaCompletaButton);

    // Dibujar el gráfico del primer tramo por defecto
    const defaultButton = tramButtonsContainer.querySelector('.tram-button');
    if (defaultButton) {
        selectTramButton(defaultButton);
        drawSinglePlot(defaultButton.textContent, resumData);
    }
}

// Función para marcar el botón seleccionado
function selectTramButton(button) {
    document.querySelectorAll('.tram-button').forEach(btn => btn.classList.remove('selected'));
    button.classList.add('selected');
}

// Ejecutar cuando el contenido del DOM esté cargado
document.addEventListener('DOMContentLoaded', () => {
    init();
});


