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
    // URLs de los datos
    const resumUrl = 'https://raw.githubusercontent.com/cvazquezfgc/planificacio-renovacio-via/main/resum.json';
    const resumData = await loadData(resumUrl);
    if (!resumData) {
        return;
    }

    // Obtener los tramos únicos
    const trams = [...new Set(resumData.map(d => d.TRAM))];
    if (trams.length === 0) {
        return;
    }

    // Contenedor de botones
    const tramButtonsContainer = document.getElementById('tramButtons');

    // Añadir el botón para "LINIA COMPLETA"
    const liniaCompletaButton = document.createElement('button');
    liniaCompletaButton.className = 'tram-button';
    liniaCompletaButton.textContent = 'LINIA COMPLETA';
    liniaCompletaButton.addEventListener('click', () => {
        // Marcar el botón como seleccionado
        selectTramButton(liniaCompletaButton);
        // Dibujar el gráfico de la línea completa
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
                // Marcar el botón como seleccionado
                selectTramButton(button);
                // Dibujar el gráfico del tramo seleccionado
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
    // Desmarcar todos los botones
    document.querySelectorAll('.tram-button').forEach(btn => btn.classList.remove('selected'));
    // Marcar el botón seleccionado
    button.classList.add('selected');
}

async function drawPlot(tram, resumData) {
    const estacionsUrl = 'https://raw.githubusercontent.com/cvazquezfgc/planificacio-renovacio-via/main/estacions.json';
    const estacionsData = await loadData(estacionsUrl);

    if (!resumData || !estacionsData) {
        return;
    }

    let traces = [];
    let stationAnnotations = [];
    let shapes = [];
    let pkMin = Infinity;
    let pkMax = -Infinity;
    let yOffset = 0;

    if (tram === 'LINIA COMPLETA') {
        const trams = [...new Set(resumData.map(d => d.TRAM))];
        trams.forEach(currentTram => {
            const via1Data = resumData.filter(d => parseInt(d.Via) === 1 && d.TRAM === currentTram);
            const via2Data = resumData.filter(d => parseInt(d.Via) === 2 && d.TRAM === currentTram);
            const estaciones = estacionsData.filter(d => d.Tram === currentTram);

            if (via1Data.length > 0 || via2Data.length > 0) {
                const via1 = groupConsecutiveSegments(via1Data);
                const via2 = groupConsecutiveSegments(via2Data);

                const tramPkMin = Math.min(...[...via1, ...via2].map(d => d.PKInici));
                const tramPkMax = Math.max(...[...via1, ...via2].map(d => d.PKFinal));

                pkMin = Math.min(pkMin, tramPkMin + yOffset);
                pkMax = Math.max(pkMax, tramPkMax + yOffset);

                // Crear datos para las barras de "Vía 1" y "Vía 2"
                traces.push({
                    x: via1.map(d => d.PREVISIO),
                    y: via1.map(d => d.PKFinal - d.PKInici),
                    base: via1.map(d => d.PKInici + yOffset),
                    type: 'bar',
                    name: `Vía 1 - ${currentTram}`,
                    orientation: 'v',
                    width: 0.5,
                    offset: 0.0,
                    marker: {
                        color: 'rgba(31, 119, 180, 1)'
                    }
                });

                traces.push({
                    x: via2.map(d => d.PREVISIO),
                    y: via2.map(d => d.PKFinal - d.PKInici),
                    base: via2.map(d => d.PKInici + yOffset),
                    type: 'bar',
                    name: `Vía 2 - ${currentTram}`,
                    orientation: 'v',
                    width: 0.5,
                    offset: 0.5,
                    marker: {
                        color: 'rgba(255, 127, 14, 1)'
                    }
                });

                // Actualizar el offset para el siguiente tramo
                yOffset += tramPkMax - tramPkMin + 0.5;
            }
        });
    } else {
        // Código para el tramo específico
        const via1Data = resumData.filter(d => parseInt(d.Via) === 1 && d.TRAM === tram);
        const via2Data = resumData.filter(d => parseInt(d.Via) === 2 && d.TRAM === tram);
        
        if (via1Data.length > 0 || via2Data.length > 0) {
            const via1 = groupConsecutiveSegments(via1Data);
            const via2 = groupConsecutiveSegments(via2Data);

            pkMin = Math.min(...[...via1, ...via2].map(d => d.PKInici));
            pkMax = Math.max(...[...via1, ...via2].map(d => d.PKFinal));

            // Crear datos para las barras de "Vía 1" y "Vía 2"
            traces.push({
                x: via1.map(d => d.PREVISIO),
                y: via1.map(d => d.PKFinal - d.PKInici),
                base: via1.map(d => d.PKInici),
                type: 'bar',
                name: 'Vía 1',
                orientation: 'v',
                width: 0.5,
                offset: 0.0,
                marker: {
                    color: 'rgba(31, 119, 180, 1)'
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
                }
            });
        }
    }

    // Configuración del gráfico
    const layout = {
        title: tram === 'LINIA COMPLETA' ? `Espai-temps previsió rehabilitació de la línia completa` : `Espai-temps previsió rehabilitació del tram ${tram}`,
        xaxis: {
            title: 'Any previsió rehabilitació',
        },
        yaxis: {
            title: 'PK',
            autorange: 'reversed'
        },
        showlegend: true
    };

    // Dibujar la gráfica
    Plotly.newPlot('plot', traces, layout);
}

// Inicializar la página y eventos
document.addEventListener('DOMContentLoaded', init);

function groupConsecutiveSegments(data) {
    const groupedData = [];
    let currentGroup = null;

    data.forEach(segment => {
        const pkInici = parseFloat(segment['PK inici']);
        const pkFinal = parseFloat(segment['PK final']);
        const previsio = segment['PREVISIÓ REHABILITACIÓ'];

        if (currentGroup && currentGroup.PKFinal === pkInici && currentGroup.PREVISIO === previsio) {
            // Si el segmento es consecutivo y del mismo año, se añade al grupo actual
            currentGroup.PKFinal = pkFinal;
            currentGroup.length += (pkFinal - pkInici) * 1000;
        } else {
            // Si no, se cierra el grupo actual y se comienza uno nuevo
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

    // Añadir el último grupo si existe
    if (currentGroup) {
        groupedData.push(currentGroup);
    }

    return groupedData;
}
