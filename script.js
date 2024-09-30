// script.js

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
    }
}

async function drawPlot(tram, resumData) {
    const estacionsUrl = 'https://raw.githubusercontent.com/cvazquezfgc/planificacio-renovacio-via/main/estacions.json';
    const estacionsData = await loadData(estacionsUrl);

    if (!resumData || !estacionsData) {
        console.error('Los datos no pudieron ser cargados.');
        return;
    }

    let traces = [];
    let stationAnnotations = [];
    let shapes = [];
    let pkMin = Infinity;
    let pkMax = -Infinity;

    if (tram === 'LINIA COMPLETA') {
        const trams = [...new Set(resumData.map(d => d.TRAM))];
        let offsetPk = 0;

        trams.forEach(currentTram => {
            console.log(`Procesando tramo: ${currentTram}`); // Mensaje de depuración
            const via1Data = resumData.filter(d => parseInt(d.Via) === 1 && d.TRAM === currentTram);
            const via2Data = resumData.filter(d => parseInt(d.Via) === 2 && d.TRAM === currentTram);
            const estaciones = estacionsData.filter(d => d.Tram === currentTram);

            if (via1Data.length > 0 || via2Data.length > 0) {
                const via1 = groupConsecutiveSegments(via1Data);
                const via2 = groupConsecutiveSegments(via2Data);

                const tramPkMin = Math.min(...[...via1, ...via2].map(d => d.PKInici));
                const tramPkMax = Math.max(...[...via1, ...via2].map(d => d.PKFinal));

                via1.forEach(segment => {
                    segment.PKInici += offsetPk;
                    segment.PKFinal += offsetPk;
                });
                via2.forEach(segment => {
                    segment.PKInici += offsetPk;
                    segment.PKFinal += offsetPk;
                });

                pkMin = Math.min(pkMin, tramPkMin + offsetPk);
                pkMax = Math.max(pkMax, tramPkMax + offsetPk);

                addBarTraces(traces, via1, via2, currentTram);

                estaciones.forEach(estacion => {
                    const pk = parseFloat(estacion['PK']) + offsetPk;
                    stationAnnotations.push({
                        x: 2068,
                        y: pk,
                        text: `<b>${estacion['Abreviatura']}</b>`,
                        showarrow: false,
                        font: {
                            color: 'black',
                            size: 14,
                            family: 'Arial, sans-serif'
                        },
                        xanchor: 'center',
                        yanchor: 'middle',
                        bgcolor: 'white',
                        bordercolor: 'gray',
                        borderwidth: 2,
                        borderpad: 5,
                        opacity: 1
                    });
                    shapes.push({
                        type: 'line',
                        x0: 1998,
                        x1: 2069,
                        y0: pk,
                        y1: pk,
                        line: {
                            color: 'darkgray',
                            width: 1.5,
                            layer: 'below'
                        }
                    });
                });

                stationAnnotations.push({
                    x: 1996,
                    y: (tramPkMin + tramPkMax) / 2 + offsetPk,
                    text: `<b>${currentTram}</b>`,
                    showarrow: false,
                    font: {
                        color: 'black',
                        size: 16,
                        family: 'Arial, sans-serif'
                    },
                    textangle: -90,
                    xanchor: 'center',
                    yanchor: 'middle',
                    bgcolor: 'lightgray',
                    bordercolor: 'gray',
                    borderwidth: 2,
                    borderpad: 5,
                    opacity: 1
                });

                offsetPk += tramPkMax - tramPkMin + 0.5;
            } else {
                console.warn(`No hay datos para el tramo ${currentTram}`);
            }
        });
    } else {
        const via1Data = resumData.filter(d => parseInt(d.Via) === 1 && d.TRAM === tram);
        const via2Data = resumData.filter(d => parseInt(d.Via) === 2 && d.TRAM === tram);
        const estaciones = estacionsData.filter(d => d.Tram === tram);

        if (via1Data.length === 0 && via2Data.length === 0) {
            console.error(`No se encontraron datos para el tramo ${tram}.`);
            Plotly.newPlot('plot', [], { title: `No hay datos disponibles para el tramo ${tram}` });
            return;
        }

        const via1 = groupConsecutiveSegments(via1Data);
        const via2 = groupConsecutiveSegments(via2Data);

        pkMin = Math.min(...[...via1, ...via2].map(d => d.PKInici));
        pkMax = Math.max(...[...via1, ...via2].map(d => d.PKFinal));

        addBarTraces(traces, via1, via2, tram);

        estaciones.forEach(estacion => {
            const pk = parseFloat(estacion['PK']);
            stationAnnotations.push({
                x: 2068,
                y: pk,
                text: `<b>${estacion['Abreviatura']}</b>`,
                showarrow: false,
                font: {
                    color: 'black',
                    size: 14,
                    family: 'Arial, sans-serif'
                },
                xanchor: 'center',
                yanchor: 'middle',
                bgcolor: 'white',
                bordercolor: 'gray',
                borderwidth: 2,
                borderpad: 5,
                opacity: 1
            });
            shapes.push({
                type: 'line',
                x0: 1998,
                x1: 2069,
                y0: pk,
                y1: pk,
                line: {
                    color: 'darkgray',
                    width: 1.5,
                    layer: 'below'
                }
            });
        });
    }

    // Añadir líneas y sombreado para los años
    for (let year = 1998; year <= 2068; year++) {
        shapes.push({
            type: 'line',
            x0: year,
            x1: year,
            y0: pkMin,
            y1: pkMax,
            line: {
                color: 'lightgray',
                width: 1,
                layer: 'below'
            }
        });

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

    // Añadir la línea roja y sombreado para 2025
    shapes.push({
        type: 'line',
        x0: 2025,
        x1: 2025,
        y0: pkMin,
        y1: pkMax,
        line: {
            color: 'red',
            width: 2,
            layer: 'below'
        }
    });

    shapes.push({
        type: 'rect',
        x0: 1998,
        x1: 2025,
        y0: pkMin,
        y1: pkMax,
        fillcolor: 'rgba(255, 0, 0, 0.1)',
        layer: 'below',
        line: {
            width: 0
        }
    });

    // Configuración del gráfico
    const layout = {
        title: `Espai-temps previsió rehabilitació del tram ${tram}`,
        titlefont: {
            family: 'Arial, sans-serif',
            size: 18,
            color: 'black'
        },
        xaxis: {
            title: 'Any previsió rehabilitació',
            titlefont: {
                size: 20,
                color: 'black',
                family: 'Arial, sans-serif',
                weight: 'bold'
            },
            tickangle: -45,
            range: [1998, 2069],
            tickvals: Array.from({ length: 71 }, (_, i) => 1998 + i).filter(year => year % 5 === 0)
        },
        yaxis: {
            title: 'PK',
            titlefont: {
                size: 20,
                color: 'black',
                family: 'Arial, sans-serif',
                weight: 'bold'
            },
            tickvals: pkRange(pkMin, pkMax),
                        ticktext: pkRange(pkMin, pkMax).map(pk => `${Math.floor(pk)}+${String((pk % 1).toFixed(3)).slice(2)}`), // Formato PK xx+xxx
            range: [pkMax, pkMin], // Para invertir el eje y mostrar el PK 0 arriba
            autorange: 'reversed'
        },
        shapes: shapes,
        annotations: stationAnnotations,
        margin: {
            l: 120,
            r: 180,
            t: 80,
            b: 150
        },
        showlegend: true,
        hovermode: 'closest', // Configurar para que solo se muestre el hover de la barra más cercana
        barmode: 'overlay' // Superponer las barras correctamente
    };

    // Dibujar el gráfico con las barras y la configuración de layout
    Plotly.newPlot('plot', traces, layout);
}

// Helper function para calcular el rango de PKs como un array de valores únicos
function pkRange(pkMin, pkMax) {
    let range = [];
    for (let pk = Math.floor(pkMin); pk <= Math.ceil(pkMax); pk++) {
        range.push(pk);
    }
    return range;
}

// Helper function para añadir las barras de Vía 1 y Vía 2
function addBarTraces(traces, via1, via2, currentTram) {
    // Añadir barras de "Vía 1" (mitad izquierda de cada año)
    traces.push({
        x: via1.map(d => d.PREVISIO),
        y: via1.map(d => (d.PKFinal - d.PKInici) * 1000), // Longitud en metros
        base: via1.map(d => d.PKInici),
        type: 'bar',
        name: 'Vía 1',
        orientation: 'v',
        width: 0.5,
        offset: -0.25, // Colocar en la mitad izquierda del año
        marker: {
            color: 'rgba(31, 119, 180, 1)'
        },
        hoverinfo: 'y',
        hovertemplate: '%{y:.0f} m<extra></extra>', // Mostrar longitud en metros, redondeado
        textposition: 'outside'
    });

    // Añadir barras de "Vía 2" (mitad derecha de cada año)
    traces.push({
        x: via2.map(d => d.PREVISIO),
        y: via2.map(d => (d.PKFinal - d.PKInici) * 1000), // Longitud en metros
        base: via2.map(d => d.PKInici),
        type: 'bar',
        name: 'Vía 2',
        orientation: 'v',
        width: 0.5,
        offset: 0.25, // Colocar en la mitad derecha del año
        marker: {
            color: 'rgba(255, 127, 14, 1)'
        },
        hoverinfo: 'y',
        hovertemplate: '%{y:.0f} m<extra></extra>', // Mostrar longitud en metros, redondeado
        textposition: 'outside'
    });
}

// Helper function para agrupar segmentos consecutivos de un mismo tramo
function groupConsecutiveSegments(data) {
    let groupedData = [];
    let currentSegment = null;

    data.forEach((d, index) => {
        if (!currentSegment) {
            currentSegment = { ...d };
        } else {
            if (currentSegment.PKFinal === d.PKInici && currentSegment.PREVISIO === d.PREVISIO) {
                // Si el segmento es consecutivo y tiene la misma previsión de rehabilitación
                currentSegment.PKFinal = d.PKFinal;
            } else {
                // Si no es consecutivo, guardar el segmento actual y empezar uno nuevo
                groupedData.push(currentSegment);
                currentSegment = { ...d };
            }
        }
        // Guardar el último segmento si es el final del array
        if (index === data.length - 1) {
            groupedData.push(currentSegment);
        }
    });

    return groupedData;
}

// Inicializar la página
async function init() {
    const resumUrl = 'https://raw.githubusercontent.com/cvazquezfgc/planificacio-renovacio-via/main/resum.json';
    const resumData = await loadData(resumUrl);
    const tramButtonsContainer = document.getElementById('tramButtons');

    if (!resumData) {
        console.error('Error al cargar los datos para llenar los botones de tramo.');
        return;
    }

    // Obtener todos los tramos únicos y añadir "LINIA COMPLETA"
    const trams = ['LINIA COMPLETA', ...new Set(resumData.map(d => d.TRAM))];

    // Añadir botones al contenedor para cada tramo
    trams.forEach(tram => {
        if (tram) {
            const button = document.createElement('button');
            button.className = 'tram-button';
            button.textContent = tram;
            button.addEventListener('click', () => {
                // Quitar la clase "selected" de todos los botones
                document.querySelectorAll('.tram-button').forEach(btn => btn.classList.remove('selected'));

                // Añadir la clase "selected" al botón actual
                button.classList.add('selected');

                // Dibujar el gráfico del tramo seleccionado
                drawPlot(tram, resumData);
            });
            tramButtonsContainer.appendChild(button);
        }
    });

    // Dibujar el gráfico inicialmente para "LINIA COMPLETA"
    if (trams.length > 0) {
        document.querySelector('.tram-button').classList.add('selected');
        drawPlot(trams[0], resumData);
    } else {
        console.error('No se encontraron tramos disponibles en los datos.');
    }
}

// Ejecutar la función de inicialización
init();

