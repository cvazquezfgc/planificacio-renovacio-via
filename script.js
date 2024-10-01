async function loadData(url) {
    try {
        const response = await fetch(url);
        if (!response.ok) {
            throw new Error(`HTTP error! Status: ${response.status}`);
        }
        const data = await response.json();
        return data;
    } catch (error) {
        console.error(`Error cargando datos de ${url}:`, error);
        return null;
    }
}

async function init() {
    const resumUrl = 'https://raw.githubusercontent.com/cvazquezfgc/planificacio-renovacio-via/main/resum.json';
    const resumData = await loadData(resumUrl);
    if (!resumData) {
        console.error('No se pudo cargar el resumen de datos.');
        return;
    }

    // Obtener los tramos únicos
    const trams = [...new Set(resumData.map(d => d.TRAM))];
    if (trams.length === 0) {
        console.error('No se encontraron tramos en los datos cargados.');
        return;
    }

    // Contenedor de botones
    const tramButtonsContainer = document.getElementById('tramButtons');

    // Añadir el botón para "LINIA COMPLETA"
    const liniaCompletaButton = document.createElement('button');
    liniaCompletaButton.className = 'tram-button';
    liniaCompletaButton.textContent = 'LINIA COMPLETA';
    liniaCompletaButton.addEventListener('click', () => {
        selectTramButton(liniaCompletaButton);
        drawPlot('LINIA COMPLETA', resumData);
    });
    tramButtonsContainer.appendChild(liniaCompletaButton);

    // Añadir botones para cada tramo
    trams.forEach(tram => {
        if (tram) {
            const button = document.createElement('button');
            button.className = 'tram-button';
            button.textContent = tram;
            button.addEventListener('click', () => {
                selectTramButton(button);
                drawPlot(tram, resumData);
            });
            tramButtonsContainer.appendChild(button);
        }
    });

    // Seleccionar y dibujar la "LINIA COMPLETA" por defecto
    selectTramButton(liniaCompletaButton);
    drawPlot('LINIA COMPLETA', resumData);
}

function selectTramButton(button) {
    document.querySelectorAll('.tram-button').forEach(btn => btn.classList.remove('selected'));
    button.classList.add('selected');
}

async function drawPlot(tram, resumData) {
    const estacionsUrl = 'https://raw.githubusercontent.com/cvazquezfgc/planificacio-renovacio-via/main/estacions.json';
    const estacionsData = await loadData(estacionsUrl);

    if (!resumData || !estacionsData) {
        console.error('No se pudieron cargar los datos necesarios.');
        return;
    }

    let traces = [];
    let stationAnnotations = [];
    let shapes = [];
    let pkMin = Infinity;
    let pkMax = -Infinity;
    let yOffset = 0;

    function groupConsecutiveSegments(data) {
        const groupedData = [];
        let currentGroup = null;

        data.forEach(segment => {
            const pkInici = parseFloat(segment['PK inici']);
            const pkFinal = parseFloat(segment['PK final']);
            const previsio = segment['PREVISIÓ REHABILITACIÓ'];

            if (currentGroup && currentGroup.PKFinal === pkInici && currentGroup.PREVISIO === previsio) {
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

    function createTracesForVia(viaData, tram, offset, viaName) {
        const via = groupConsecutiveSegments(viaData);

        return {
            x: via.map(d => d.PREVISIO),
            y: via.map(d => d.PKFinal - d.PKInici),
            base: via.map(d => d.PKInici + offset),
            type: 'bar',
            name: `${viaName} - ${tram}`,
            orientation: 'v',
            width: 0.5,
            offset: viaName === 'Vía 1' ? 0.0 : 0.5,
            marker: {
                color: viaName === 'Vía 1' ? 'rgba(31, 119, 180, 1)' : 'rgba(255, 127, 14, 1)'
            },
            hoverinfo: 'text',
            hovertext: via.map(d => `${Math.round(d.length)} m`), // Etiquetas hover indicando longitud en metros
            textposition: 'outside'
        };
    }

    function addLinesAndShading(pkMin, pkMax) {
        // Añadir líneas verticales para cada año y sombreado cada 5 años
        for (let year = 1998; year <= 2069; year++) {
            // Línea vertical para cada año
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

            // Sombreado en cada lustro
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
    }

    if (tram === 'LINIA COMPLETA') {
        const trams = [...new Set(resumData.map(d => d.TRAM))];
        trams.forEach(currentTram => {
            const via1Data = resumData.filter(d => parseInt(d.Via) === 1 && d.TRAM === currentTram);
            const via2Data = resumData.filter(d => parseInt(d.Via) === 2 && d.TRAM === currentTram);
            const estaciones = estacionsData.filter(d => d.Tram === currentTram);

            if (via1Data.length > 0 || via2Data.length > 0) {
                const tramPkMin = Math.min(...via1Data.concat(via2Data).map(d => parseFloat(d['PK inici'])));
                const tramPkMax = Math.max(...via1Data.concat(via2Data).map(d => parseFloat(d['PK final'])));

                pkMin = Math.min(pkMin, tramPkMin + yOffset);
                pkMax = Math.max(pkMax, tramPkMax + yOffset);

                // Añadir las trazas para ambas vías
                traces.push(createTracesForVia(via1Data, currentTram, yOffset, 'Vía 1'));
                traces.push(createTracesForVia(via2Data, currentTram, yOffset, 'Vía 2'));

                // Añadir anotaciones y líneas de referencia para las estaciones
                stationAnnotations.push(...estaciones.map(d => ({
                    x: 2069,
                    y: parseFloat(d['PK']) + yOffset,
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
                    x0: 1998,
                    x1: 2069,
                    y0: parseFloat(d['PK']) + yOffset,
                    y1: parseFloat(d['PK']) + yOffset,
                    line: {
                        color: 'darkgray',
                        width: 1.5,
                        layer: 'below'
                    }
                })));

                addLinesAndShading(pkMin, pkMax);
                yOffset += tramPkMax - tramPkMin + 0.5;
            }
        });
    } else {
        // Lógica para un tramo específico
        const via1Data = resumData.filter(d => parseInt(d.Via) === 1 && d.TRAM === tram);
        const via2Data = resumData.filter(d => parseInt(d.Via) === 2 && d.TRAM === tram);
        const estaciones = estacionsData.filter(d => d.Tram === tram);

        if (via1Data.length > 0 || via2Data.length > 0) {
            pkMin = Math.min(...via1Data.concat(via2Data).map(d => parseFloat(d['PK inici'])));
            pkMax = Math.max(...via1Data.concat(via2Data).map(d => parseFloat(d['PK final'])));

            // Añadir las trazas para ambas vías
            traces.push(createTracesForVia(via1Data, tram, 0, 'Vía 1'));
            traces.push(createTracesForVia(via2Data, tram, 0, 'Vía 2'));

            // Añadir anotaciones y líneas de referencia para las estaciones
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
                x0: 1998,
                x1: 2069,
                y0: parseFloat(d['PK']),
                y1: parseFloat(d['PK']),
                line: {
                    color: 'darkgray',
                    width: 1.5,
                    layer: 'below'
                }
            })));

            addLinesAndShading(pkMin, pkMax);
        }
    }

    // Configuración del gráfico
    const layout = {
        title: tram === 'LINIA COMPLETA' ? `Espai-temps previsió rehabilitació de la línia completa` : `Espai-temps previsió rehabilitació del tram ${tram}`,
        xaxis: {
            title: 'Any previsió rehabilitació',
            tickvals: Array.from({ length: 71 }, (_, i) => 1998 + i).filter(year => year % 5 === 0),
            tickangle: -45 // Inclinar etiquetas del eje X a 45 grados
        },
        yaxis: {
            title: 'PK',
            autorange: 'reversed',
            tickvals: Array.from({ length: Math.ceil(pkMax - pkMin + 1) }, (_, i) => Math.floor(pkMin) + i),
            ticktext: Array.from({ length: Math.ceil(pkMax - pkMin + 1) }, (_, i) => `${Math.floor(pkMin) + i}+000`)
        },
        showlegend: true,
        annotations: stationAnnotations,
        shapes: shapes
    };

    // Dibujar la gráfica
    Plotly.newPlot('plot', traces, layout);
}

// Inicializar la página y eventos
document.addEventListener('DOMContentLoaded', init);
