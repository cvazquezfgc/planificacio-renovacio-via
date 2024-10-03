// Verificar si Plotly está definido y cargado
if (typeof Plotly === 'undefined') {
    console.error('Plotly no está cargado. Asegúrate de que el script de Plotly está incluido correctamente.');
    document.body.innerHTML += '<p style="color:red;">Plotly no está cargado correctamente.</p>';
} else {
    console.log('Plotly se ha cargado correctamente.');
    document.body.innerHTML += '<p style="color:green;">Plotly está cargado correctamente.</p>';

    // Dibujar un gráfico simple para verificar si funciona
    const plotContainer = document.createElement('div');
    plotContainer.id = 'test-plot';
    document.body.appendChild(plotContainer);

    const data = [
        {
            x: [1, 2, 3, 4, 5],
            y: [10, 20, 30, 40, 50],
            type: 'scatter',
            mode: 'lines+markers',
            name: 'Test Plot'
        }
    ];
    const layout = {
        title: 'Gráfico de prueba inicial',
        xaxis: {
            title: 'Eje X'
        },
        yaxis: {
            title: 'Eje Y'
        }
    };

    console.log('Intentando dibujar un gráfico simple...');
    try {
        Plotly.newPlot('test-plot', data, layout);
        console.log('Gráfico de prueba dibujado correctamente.');
    } catch (error) {
        console.error('Error al intentar dibujar el gráfico de prueba:', error);
    }
}

async function loadData(url) {
    console.log(`Cargando datos desde: ${url}`);
    try {
        const response = await fetch(url);
        if (!response.ok) {
            throw new Error(`Error HTTP! Estado: ${response.status}`);
        }
        const data = await response.json();
        console.log(`Datos cargados exitosamente desde: ${url}`);
        return data;
    } catch (error) {
        console.error(`Error cargando datos de ${url}:`, error);
        return null;
    }
}

async function init() {
    console.log('Inicializando la aplicación...');
    const resumUrl = 'https://raw.githubusercontent.com/cvazquezfgc/planificacio-renovacio-via/main/resum.json';
    const resumData = await loadData(resumUrl);
    if (!resumData) {
        console.error('No se pudo cargar el resumen de datos.');
        return;
    }

    // Verificar los datos cargados
    console.log('Datos del resumen:', resumData);

    // Obtener los tramos únicos
    const trams = [...new Set(resumData.map(d => d.TRAM))];
    if (trams.length === 0) {
        console.error('No se encontraron tramos en los datos cargados.');
        return;
    }

    console.log('Tramos encontrados:', trams);

    // Contenedor de botones de tramo
    const tramButtonsContainer = document.getElementById('tramButtons');
    if (!tramButtonsContainer) {
        console.error('No se encontró el contenedor de botones de tramo en el DOM.');
        return;
    }

    // Añadir el botón para "LINIA COMPLETA"
    const liniaCompletaButton = document.createElement('button');
    liniaCompletaButton.className = 'tram-button';
    liniaCompletaButton.textContent = 'LINIA COMPLETA';
    liniaCompletaButton.addEventListener('click', () => {
        selectTramButton(liniaCompletaButton);
        drawFullLinePlot(trams, resumData);
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
                drawSinglePlot(tram, resumData);
            });
            tramButtonsContainer.appendChild(button);
        }
    });

    console.log('Botones de tramos añadidos correctamente.');
}

function selectTramButton(button) {
    // Deseleccionar todos los botones
    document.querySelectorAll('.tram-button').forEach(btn => btn.classList.remove('selected'));
    // Marcar el botón seleccionado
    button.classList.add('selected');
    console.log(`Botón seleccionado: ${button.textContent}`);
}

async function drawSinglePlot(tram, resumData) {
    console.log(`Dibujando gráfico para el tramo: ${tram}`);
    // Borrar gráficos existentes
    document.getElementById('plot').innerHTML = '';

    if (typeof Plotly === 'undefined') {
        console.error('Plotly no está definido. No se puede dibujar el gráfico.');
        return;
    }

    // Crear un gráfico simple para verificar si se renderiza correctamente
    const plotContainer = document.getElementById('plot');
    const data = [
        {
            x: [1, 2, 3, 4, 5],
            y: [10, 20, 30, 40, 50],
            type: 'scatter',
            mode: 'lines+markers',
            name: 'Prueba'
        }
    ];
    const layout = {
        title: `Gráfico de prueba para el tramo ${tram}`,
        xaxis: {
            title: 'Año'
        },
        yaxis: {
            title: 'Valor'
        }
    };

    console.log(`Intentando dibujar un gráfico de prueba para el tramo ${tram}`);
    try {
        Plotly.newPlot(plotContainer, data, layout);
        console.log('Gráfico de prueba dibujado correctamente.');
    } catch (error) {
        console.error('Error al intentar dibujar el gráfico de prueba:', error);
    }
}

async function drawFullLinePlot(trams, resumData) {
    console.log('Dibujando gráficos concatenados para LINIA COMPLETA...');
    // Borrar gráficos existentes
    document.getElementById('plot').innerHTML = '';

    if (typeof Plotly === 'undefined') {
        console.error('Plotly no está definido. No se puede dibujar el gráfico.');
        return;
    }

    // Crear un gráfico simple para verificar si se renderiza correctamente
    const plotContainer = document.getElementById('plot');
    const data = [
        {
            x: [1, 2, 3, 4, 5],
            y: [20, 30, 40, 50, 60],
            type: 'scatter',
            mode: 'lines+markers',
            name: 'Prueba Completa'
        }
    ];
    const layout = {
        title: `Gráfico de prueba para LINIA COMPLETA`,
        xaxis: {
            title: 'Año'
        },
        yaxis: {
            title: 'Valor'
        }
    };

    console.log('Intentando dibujar un gráfico de prueba para LINIA COMPLETA');
    try {
        Plotly.newPlot(plotContainer, data, layout);
        console.log('Gráfico de prueba para LINIA COMPLETA dibujado correctamente.');
    } catch (error) {
        console.error('Error al intentar dibujar el gráfico de prueba para LINIA COMPLETA:', error);
    }
}

// Inicializar la página y los eventos
document.addEventListener('DOMContentLoaded', () => {
    console.log('Contenido DOM cargado, iniciando script...');
    init();
});
