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
        console.error('Error al cargar los datos para llenar los botones de tramo.');
        return;
    }

    const tramButtonsContainer = document.getElementById('tramButtons');
    const trams = [...new Set(resumData.map(d => d.TRAM))];

    const liniaCompletaButton = document.createElement('button');
    liniaCompletaButton.className = 'tram-button';
    liniaCompletaButton.textContent = 'LINIA COMPLETA';
    liniaCompletaButton.addEventListener('click', () => {
        selectTramButton(liniaCompletaButton);
        drawPlot('LINIA COMPLETA', resumData);
    });
    tramButtonsContainer.appendChild(liniaCompletaButton);

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
    let yOffset = 0;

    if (tram === 'LINIA COMPLETA') {
        const trams = [...new Set(resumData.map(d => d.TRAM))];
        trams.forEach(currentTram => {
            // Similar lógica a la versión anterior para concatenar los tramos
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

        // Crear los datos para las barras de "Vía 1" y "Vía 2" y añadir anotaciones y formas similares a la versión anterior
    }

    // Añadir líneas, sombreado y dibujar el gráfico similar a la versión anterior
    const layout = {
        // Configuración del layout
    };

    Plotly.newPlot('plot', traces, layout);
}

document.addEventListener('DOMContentLoaded', init);
