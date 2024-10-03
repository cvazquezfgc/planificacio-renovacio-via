async function drawSinglePlot(tram, resumData) {
    console.log(`Dibujando gráfico para el tramo: ${tram}`);
    // Borrar gráficos existentes
    document.getElementById('plot').innerHTML = '';

    // Cargar los datos de las estaciones
    const estacionsUrl = 'https://raw.githubusercontent.com/cvazquezfgc/planificacio-renovacio-via/main/estacions.json';
    const estacionsData = await loadData(estacionsUrl);
    if (!estacionsData) {
        console.error('No se pudo cargar los datos de las estaciones.');
        return;
    }

    console.log('Datos de estaciones cargados correctamente.');

    // Crear un gráfico simple para verificar si se renderiza correctamente
    const plotContainer = document.getElementById('plot');
    const data = [
        {
            x: [1995, 2000, 2005, 2010],
            y: [10, 15, 13, 17],
            type: 'scatter',
            name: 'Prueba'
        }
    ];
    const layout = {
        title: `Gráfico de prueba para el tramo ${tram}`,
        xaxis: {
            title: 'Año',
            range: [1995, 2015]
        },
        yaxis: {
            title: 'Valor'
        },
        margin: {
            l: 50,
            r: 50,
            t: 80, // Incrementar el margen superior para evitar que se corte el título
            b: 50
        }
    };

    console.log(`Dibujando gráfico de prueba para el tramo ${tram}`);
    Plotly.newPlot(plotContainer, data, layout);
}

async function drawFullLinePlot(trams, resumData) {
    console.log('Dibujando gráficos concatenados para LINIA COMPLETA...');
    // Borrar gráficos existentes
    document.getElementById('plot').innerHTML = '';

    // Crear un gráfico simple para "LINIA COMPLETA"
    const plotContainer = document.getElementById('plot');
    const data = [
        {
            x: [1995, 2000, 2005, 2010],
            y: [20, 25, 23, 27],
            type: 'scatter',
            name: 'Prueba Completa'
        }
    ];
    const layout = {
        title: `Gráfico de prueba para LINIA COMPLETA`,
        xaxis: {
            title: 'Año',
            range: [1995, 2015]
        },
        yaxis: {
            title: 'Valor'
        },
        margin: {
            l: 50,
            r: 50,
            t: 80,
            b: 50
        }
    };

    console.log(`Dibujando gráfico de prueba para LINIA COMPLETA`);
    Plotly.newPlot(plotContainer, data, layout);
}
