async function loadData(url) {
    try {
        const response = await fetch(url);
        if (!response.ok) {
            throw new Error(`HTTP error! Status: ${response.status}`);
        }
        const data = await response.json();
        console.log(`Datos cargados de ${url}:`, data); // Mostrar datos cargados para ver si llegan bien
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
        console.error('Error al cargar los datos para llenar los botones de tramo.');
        return;
    }

    const tramButtonsContainer = document.getElementById('tramButtons');
    const trams = [...new Set(resumData.map(d => d.TRAM))];

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

    // Definir datos según la opción seleccionada
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

                // Ajustar el rango de PK con el offset
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

                // Añadir las barras de Vía 1 y Vía 2
                addBarTraces(traces, via1, via2, currentTram);

                // Añadir las líneas y etiquetas de estaciones
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

                // Añadir la etiqueta del tramo al eje Y
                stationAnnotations.push({
                    x: 1996, // Colocar a la izquierda del eje Y
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

                // Incrementar el offset para el siguiente tramo
                offsetPk += tramPkMax - tramPkMin + 0.5; // Añadir un espacio entre tramos
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

        // Añadir las líneas y etiquetas de estaciones
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

    // Añadir líneas verticales para cada año y sombreado de años múltiplos de 5
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

        // Sombreado para años múltiplos de 5
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

    // Añadir la línea roja vertical en 2025 y el sombreado rojo en años anteriores
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
            tickvals: Array.from({ length: 71 }, (_, i) => 1998 + i        },
        yaxis: {
            title: 'PK',
            titlefont: {
                size: 20,
                color: 'black',
                family: 'Arial, sans-serif',
                weight: 'bold'
            },
            tickvals: pkRange(pkMin, pkMax),
            ticktext: pkRange(pkMin, pkMax).map(pk => `${Math.floor(pk)}+${Math.round((pk % 1) * 1000).toString().padStart(3, '0')}`),
            range: [pkMax, pkMin],
            autorange: 'reversed'
        },
        shapes: shapes, // Añadir todas las formas (líneas, sombreados, etc.)
        annotations: stationAnnotations, // Añadir todas las etiquetas de las estaciones
        margin: {
            l: 160,
            r: 180,
            t: 80,
            b: 150
        },
        showlegend: true,
        hovermode: 'closest', // Configurar para que sólo se muestre el hover de la barra más cercana
        barmode: 'overlay' // Para superponer las barras correctamente
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
        y: via1.map(d => d.PKFinal - d.PKInici),
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
        y: via2.map(d => d.PKFinal - d.PKInici),
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

// Inicializar la página
init();

