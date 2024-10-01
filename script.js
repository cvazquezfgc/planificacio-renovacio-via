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
        console.error('Error al cargar los datos para llenar los botones de tramo.');
        return;
    }

    // Obtener los tramos únicos
    const trams = [...new Set(resumData.map(d => d.TRAM))];
    if (trams.length === 0) {
        console.error('No se encontraron tramos disponibles en los datos.');
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

    // Resto del código relacionado con el dibujo de la gráfica sigue aquí...
    // (mueve el resto de `drawPlot` desde tu HTML)
}

// Inicializar la página y eventos
document.addEventListener('DOMContentLoaded', init);
