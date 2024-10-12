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

// Variables globales
let resumData = null; // Datos cargados de resum.json
let trams = [];       // Lista de tramos
let estacionsData = null; // Datos de estaciones
let filteredData = null; // Datos filtrados para la tabla

// Función para mostrar el menú desplegable
function setupDropdownMenu() {
    const menuIcon = document.getElementById('menu-icon');
    const dropdownMenu = document.getElementById('dropdown-menu');
    const dropdownItems = document.querySelectorAll('.dropdown-item');
    const headerTitle = document.getElementById('header-title');

    function hideMenuOnClickOutside(event) {
        if (!dropdownMenu.contains(event.target) && event.target !== menuIcon) {
            dropdownMenu.style.display = 'none';
            document.removeEventListener('click', hideMenuOnClickOutside);
        }
    }

    function toggleDropdown() {
        if (dropdownMenu.style.display === 'block') {
            dropdownMenu.style.display = 'none';
            document.removeEventListener('click', hideMenuOnClickOutside);
        } else {
            dropdownMenu.style.display = 'block';
            document.addEventListener('click', hideMenuOnClickOutside);
        }
    }

    menuIcon.addEventListener('click', toggleDropdown);

    dropdownItems.forEach(item => {
        item.addEventListener('click', () => {
            dropdownItems.forEach(i => i.classList.remove('selected'));
            item.classList.add('selected');
            dropdownMenu.style.display = 'none'; // Ocultar el menú inmediatamente
            document.removeEventListener('click', hideMenuOnClickOutside);

            const selectedView = item.getAttribute('data-view');
            if (selectedView === 'rehabilitacio') {
                headerTitle.textContent = 'Previsió rehabilitació de via';
                showRehabilitacioView();
            } else if (selectedView === 'inventari') {
                headerTitle.textContent = 'Inventari de via';
                showInventariView();
            }
        });
    });
}

// Función para mostrar la vista de rehabilitación
function showRehabilitacioView() {
    document.getElementById('plot').style.display = 'block';
    document.getElementById('title-container').style.display = 'block';
    document.getElementById('tramButtons').style.display = 'flex';
    document.getElementById('table-container').style.display = 'none';

    // Restaurar el último tramo seleccionado o seleccionar el primero
    const selectedButton = document.querySelector('.tram-button.selected');
    if (selectedButton) {
        const tram = selectedButton.textContent;
        if (tram === 'LINIA COMPLETA') {
            drawFullLinePlot(trams, resumData);
        } else {
            drawSinglePlot(tram, resumData);
        }
    } else {
        const firstTramButton = document.querySelector('.tram-button');
        if (firstTramButton) {
            selectTramButton(firstTramButton);
            drawSinglePlot(firstTramButton.textContent, resumData);
        }
    }
}

// Función para mostrar la vista de inventario
async function showInventariView() {
    document.getElementById('plot').style.display = 'none';
    document.getElementById('title-container').style.display = 'none';
    document.getElementById('tramButtons').style.display = 'none';
    document.getElementById('table-container').style.display = 'block';

    if (!resumData) {
        const resumUrl = 'https://raw.githubusercontent.com/cvazquezfgc/planificacio-renovacio-via/main/resum.json';
        resumData = await loadData(resumUrl);
        if (!resumData) {
            console.error('No se pudo cargar el resumen de datos.');
            return;
        }
    }

    filteredData = resumData; // Inicialmente, sin filtros
    renderTable(filteredData);
}

// Función para renderizar la tabla
function renderTable(data) {
    const tableContainer = document.getElementById('table-container');
    tableContainer.innerHTML = ''; // Limpiar contenido previo

    const table = document.createElement('table');
    table.id = 'data-table';

    // Crear encabezados
    const headers = Object.keys(data[0]);
    const thead = document.createElement('thead');
    const headerRow = document.createElement('tr');

    headers.forEach((headerText, index) => {
        const th = document.createElement('th');
        th.textContent = headerText;
        th.addEventListener('click', () => {
            showFilterDropdown(th, headerText);
        });
        headerRow.appendChild(th);
    });
    thead.appendChild(headerRow);
    table.appendChild(thead);

    // Crear filas de datos
    const tbody = document.createElement('tbody');
    data.forEach(rowData => {
        const row = document.createElement('tr');
        headers.forEach(headerText => {
            const cell = document.createElement('td');
            cell.textContent = rowData[headerText];
            row.appendChild(cell);
        });
        tbody.appendChild(row);
    });
    table.appendChild(tbody);

    tableContainer.appendChild(table);
}

// Función para mostrar el menú de filtrado
function showFilterDropdown(th, headerText) {
    let filterDropdown = document.getElementById('filter-dropdown');
    if (filterDropdown) {
        filterDropdown.remove();
    }

    filterDropdown = document.createElement('div');
    filterDropdown.id = 'filter-dropdown';
    filterDropdown.style.position = 'absolute';
    filterDropdown.style.backgroundColor = 'white';
    filterDropdown.style.border = '1px solid #ccc';
    filterDropdown.style.zIndex = '1000';
    filterDropdown.style.maxHeight = '200px';
    filterDropdown.style.overflowY = 'auto';

    const rect = th.getBoundingClientRect();
    filterDropdown.style.left = `${rect.left}px`;
    filterDropdown.style.top = `${rect.bottom}px`;

    const uniqueValues = [...new Set(resumData.map(d => d[headerText]))].sort();
    uniqueValues.forEach(value => {
        const label = document.createElement('label');
        label.style.display = 'block';
        const checkbox = document.createElement('input');
        checkbox.type = 'checkbox';
        checkbox.value = value;
        checkbox.checked = true;
        checkbox.addEventListener('change', () => {
            applyFilters();
        });
        label.appendChild(checkbox);
        label.appendChild(document.createTextNode(value));
        filterDropdown.appendChild(label);
    });

    document.body.appendChild(filterDropdown);

    // Ocultar el menú al hacer clic fuera
    function hideFilterDropdown(event) {
        if (!filterDropdown.contains(event.target)) {
            filterDropdown.remove();
            document.removeEventListener('click', hideFilterDropdown);
        }
    }
    document.addEventListener('click', hideFilterDropdown);
}

// Función para aplicar los filtros seleccionados
function applyFilters() {
    const filterDropdown = document.getElementById('filter-dropdown');
    if (!filterDropdown) return;

    const checkboxes = filterDropdown.querySelectorAll('input[type="checkbox"]');
    const headerText = filterDropdown.previousSibling.textContent;

    const selectedValues = [...checkboxes]
        .filter(checkbox => checkbox.checked)
        .map(checkbox => checkbox.value);

    filteredData = resumData.filter(row => selectedValues.includes(row[headerText]));

    renderTable(filteredData);
}

// Función para dibujar gráficos concatenados para LINIA COMPLETA
async function drawFullLinePlot(trams, resumData) {
    document.getElementById('plot').innerHTML = '';
    document.getElementById('title-container').innerHTML = `
        <h2 style="font-family: Arial, sans-serif; font-size: 24px; font-weight: normal; text-align: center;">
            Espai-temps previsió rehabilitació de la línia completa
        </h2>`;

    if (!estacionsData) {
        const estacionsUrl = 'https://raw.githubusercontent.com/cvazquezfgc/planificacio-renovacio-via/main/estacions.json';
        estacionsData = await loadData(estacionsUrl);
        if (!estacionsData) {
            console.error('No se pudo cargar los datos de las estaciones.');
            return;
        }
    }

    const unitHeightPerKm = 60.75; // Reducir un 10% adicional
    const fixedHeightComponents = 100;

    for (let i = 0; i < trams.length; i++) {
        const tram = trams[i];

        const via1Data = resumData.filter(d => parseInt(d.Via) === 1 && d.TRAM === tram);
        const via2Data = resumData.filter(d => parseInt(d.Via) === 2 && d.TRAM === tram);

        const pkMin = Math.min(...via1Data.concat(via2Data).map(d => parseFloat(d['PK inici'])));
        const pkMax = Math.max(...via1Data.concat(via2Data).map(d => parseFloat(d['PK final'])));
        const tramoLength = pkMax - pkMin;
        let tramoHeight = fixedHeightComponents + (tramoLength * unitHeightPerKm);

        if (tramoHeight < 250) {
            tramoHeight = 250;
        }

        // Crear contenedor para el tramo
        const tramContainer = document.createElement('div');
        tramContainer.className = 'tram-container';

        // Contenedor para el gráfico y la etiqueta del tramo
        const plotAndLabelContainer = document.createElement('div');
        plotAndLabelContainer.className = 'plot-and-label';

        // Etiqueta del tramo
        const labelContainer = document.createElement('div');
        labelContainer.className = 'label-container';
        const label = document.createElement('div');
        label.textContent = tram;
        labelContainer.appendChild(label);

        // Contenedor del gráfico
        const plotContainer = document.createElement('div');
        plotContainer.className = 'plot-container';
        plotContainer.id = `plot-${tram}-chart`;
        plotContainer.style.height = `${tramoHeight}px`;

        plotAndLabelContainer.appendChild(labelContainer);
        plotAndLabelContainer.appendChild(plotContainer);

        // Contenedor de los gráficos de quesitos
        const piesContainer = document.createElement('div');
        piesContainer.className = 'pie-charts-container';

        // Añadir contenedores al contenedor principal del tramo
        tramContainer.appendChild(plotAndLabelContainer);
        tramContainer.appendChild(piesContainer);

        // Añadir el contenedor del tramo al contenedor principal
        document.getElementById('plot').appendChild(tramContainer);

        // Ahora que el elemento está en el DOM, podemos llamar a drawPlot
        const addHorizontalLabels = true;
        await drawPlot(tram, resumData, estacionsData, plotContainer.id, addHorizontalLabels, pkMin, pkMax, tramoHeight, fixedHeightComponents);

        // Calcular datos para los gráficos de quesitos
        const totalLength = resumData
            .filter(d => d.TRAM === tram)
            .reduce((sum, d) => sum + (parseFloat(d['PK final']) - parseFloat(d['PK inici'])) * 1000, 0);

        const lengthBefore2025 = resumData
            .filter(d => d.TRAM === tram && parseInt(d['PREVISIÓ REHABILITACIÓ']) < 2025)
            .reduce((sum, d) => sum + (parseFloat(d['PK final']) - parseFloat(d['PK inici'])) * 1000, 0);

        const lengthBetween2025And2030 = resumData
            .filter(d => d.TRAM === tram && parseInt(d['PREVISIÓ REHABILITACIÓ']) >= 2025 && parseInt(d['PREVISIÓ REHABILITACIÓ']) <= 2030)
            .reduce((sum, d) => sum + (parseFloat(d['PK final']) - parseFloat(d['PK inici'])) * 1000, 0);

        // Gráfico de quesito para < 2025
        const pieChartBefore2025Container = document.createElement('div');
        const pieChartBefore2025Title = document.createElement('div');
        pieChartBefore2025Title.className = 'pie-chart-title';
        pieChartBefore2025Title.textContent = '<2025';

        const pieDataBefore2025 = [
            {
                values: [lengthBefore2025, totalLength - lengthBefore2025],
                labels: ['', ''],
                marker: {
                    colors: ['rgba(255, 0, 0, 0.8)', 'rgba(200, 200, 200, 0.3)']
                },
                type: 'pie',
                textinfo: 'none',
                hoverinfo: 'none',
                direction: 'clockwise',
                rotation: 0,
                sort: false,
                hole: 0.4
            }
        ];

        const pieLayoutBefore2025 = {
            height: 150,
            width: 150,
            margin: { t: 0, b: 0, l: 0, r: 0 },
            showlegend: false,
            annotations: [
                {
                    x: 0.5,
                    y: 1.1,
                    xref: 'paper',
                    yref: 'paper',
                    text: `<b>${lengthBefore2025.toLocaleString('de-DE')} m<br>${((lengthBefore2025 / totalLength) * 100).toFixed(1)}%</b>`,
                    showarrow: false,
                    font: {
                        size: 14,
                        color: 'red'
                    },
                    align: 'center'
                }
            ]
        };

        const pieChartBefore2025 = document.createElement('div');
        pieChartBefore2025Container.appendChild(pieChartBefore2025Title);
        pieChartBefore2025Container.appendChild(pieChartBefore2025);
        piesContainer.appendChild(pieChartBefore2025Container);
        Plotly.newPlot(pieChartBefore2025, pieDataBefore2025, pieLayoutBefore2025, { displayModeBar: false });

        // Gráfico de quesito para 2025-2030
        const pieChartBetween2025And2030Container = document.createElement('div');
        const pieChartBetween2025And2030Title = document.createElement('div');
        pieChartBetween2025And2030Title.className = 'pie-chart-title';
        pieChartBetween2025And2030Title.textContent = '2025-2030';

        const pieDataBetween2025And2030 = [
            {
                values: [lengthBefore2025, lengthBetween2025And2030, totalLength - lengthBefore2025 - lengthBetween2025And2030],
                labels: ['', '', ''],
                marker: {
                    colors: ['rgba(150, 150, 150, 0.8)', 'rgba(255, 165, 0, 0.8)', 'rgba(200, 200, 200, 0.3)']
                },
                type: 'pie',
                textinfo: 'none',
                hoverinfo: 'none',
                direction: 'clockwise',
                rotation: 0,
                sort: false,
                hole: 0.4
            }
        ];

        const pieLayoutBetween2025And2030 = {
            height: 150,
            width: 150,
            margin: { t: 0, b: 0, l: 0, r: 0 },
            showlegend: false,
            annotations: [
                {
                    x: 0.5,
                    y: 1.1,
                    xref: 'paper',
                    yref: 'paper',
                    text: `<b>${lengthBetween2025And2030.toLocaleString('de-DE')} m<br>${((lengthBetween2025And2030 / totalLength) * 100).toFixed(1)}%</b>`,
                    showarrow: false,
                    font: {
                        size: 14,
                        color: 'orange'
                    },
                    align: 'center'
                }
            ]
        };

        const pieChartBetween2025And2030 = document.createElement('div');
        pieChartBetween2025And2030Container.appendChild(pieChartBetween2025And2030Title);
        pieChartBetween2025And2030Container.appendChild(pieChartBetween2025And2030);
        piesContainer.appendChild(pieChartBetween2025And2030Container);
        Plotly.newPlot(pieChartBetween2025And2030, pieDataBetween2025And2030, pieLayoutBetween2025And2030, { displayModeBar: false });
    }

    document.body.style.height = 'auto';
    document.body.style.overflow = 'auto';
}

// Función para dibujar gráficos de tramos individuales y ajustar los gráficos de quesitos
async function drawSinglePlot(tram, resumData) {
    document.getElementById('plot').innerHTML = '';
    document.getElementById('title-container').innerHTML = `
        <div id="title">
            Espai-temps previsió rehabilitació tram ${tram}
        </div>`;

    if (!estacionsData) {
        const estacionsUrl = 'https://raw.githubusercontent.com/cvazquezfgc/planificacio-renovacio-via/main/estacions.json';
        estacionsData = await loadData(estacionsUrl);
        if (!estacionsData) {
            console.error('No se pudo cargar los datos de las estaciones.');
            return;
        }
    }

    const plotContainer = document.createElement('div');
    plotContainer.id = 'plot-container-single';
    plotContainer.style.height = '400px';

    document.getElementById('plot').appendChild(plotContainer);

    await drawPlot(tram, resumData, estacionsData, plotContainer.id, true, null, null, 400);

    // Añadir una línea horizontal de separación
    const separator = document.createElement('hr');
    separator.style.border = '1px solid lightgray';
    separator.style.marginTop = '20px';
    separator.style.marginBottom = '20px';
    document.getElementById('plot').appendChild(separator);

    const totalLength = resumData
        .filter(d => d.TRAM === tram)
        .reduce((sum, d) => sum + (parseFloat(d['PK final']) - parseFloat(d['PK inici'])) * 1000, 0);

    const lengthBefore2025 = resumData
        .filter(d => d.TRAM === tram && parseInt(d['PREVISIÓ REHABILITACIÓ']) < 2025)
        .reduce((sum, d) => sum + (parseFloat(d['PK final']) - parseFloat(d['PK inici'])) * 1000, 0);

    const lengthBetween2025And2030 = resumData
        .filter(d => d.TRAM === tram && parseInt(d['PREVISIÓ REHABILITACIÓ']) >= 2025 && parseInt(d['PREVISIÓ REHABILITACIÓ']) <= 2030)
        .reduce((sum, d) => sum + (parseFloat(d['PK final']) - parseFloat(d['PK inici'])) * 1000, 0);

    // Crear los gráficos de quesitos con el diseño solicitado
    const pieContainer = document.createElement('div');
    pieContainer.style.display = 'flex';
    pieContainer.style.flexDirection = 'column';
    pieContainer.style.alignItems = 'center';

    // Gráfico de quesito para < 2025
    const pieChartBefore2025Container = document.createElement('div');
    const pieChartBefore2025Title = document.createElement('div');
    pieChartBefore2025Title.className = 'pie-chart-title';
    pieChartBefore2025Title.textContent = 'Longitud a rehabilitar <2025';

    const pieDataBefore2025 = [
        {
            values: [lengthBefore2025, totalLength - lengthBefore2025],
            labels: ['', ''],
            marker: {
                colors: ['rgba(255, 0, 0, 0.8)', 'rgba(200, 200, 200, 0.3)']
            },
            type: 'pie',
            textinfo: 'none',
            hoverinfo: 'none',
            direction: 'clockwise',
            rotation: 0,
            sort: false,
            hole: 0.4
        }
    ];

    const pieLayoutBefore2025 = {
        height: 200,
        width: 200,
        margin: { t: 0, b: 0, l: 0, r: 0 },
        showlegend: false,
        annotations: [
            {
                x: 0.5,
                y: 1.1,
                xref: 'paper',
                yref: 'paper',
                text: `<b>${lengthBefore2025.toLocaleString('de-DE')} m<br>${((lengthBefore2025 / totalLength) * 100).toFixed(1)}%</b>`,
                showarrow: false,
                font: {
                    size: 14,
                    color: 'red'
                },
                align: 'center'
            }
        ]
    };

    const pieChartBefore2025 = document.createElement('div');
    pieChartBefore2025Container.appendChild(pieChartBefore2025Title);
    pieChartBefore2025Container.appendChild(pieChartBefore2025);
    pieContainer.appendChild(pieChartBefore2025Container);
    Plotly.newPlot(pieChartBefore2025, pieDataBefore2025, pieLayoutBefore2025, { displayModeBar: false });

    // Gráfico de quesito para 2025-2030
    const pieChartBetween2025And2030Container = document.createElement('div');
    const pieChartBetween2025And2030Title = document.createElement('div');
    pieChartBetween2025And2030Title.className = 'pie-chart-title';
    pieChartBetween2025And2030Title.textContent = 'Longitud a rehabilitar 2025-2030';

    const pieDataBetween2025And2030 = [
        {
            values: [lengthBetween2025And2030, totalLength - lengthBetween2025And2030],
            labels: ['', ''],
            marker: {
                colors: ['rgba(255, 165, 0, 0.8)', 'rgba(200, 200, 200, 0.3)']
            },
            type: 'pie',
            textinfo: 'none',
            hoverinfo: 'none',
            direction: 'clockwise',
            rotation: 0,
            sort: false,
            hole: 0.4
        }
    ];

    const pieLayoutBetween2025And2030 = {
        height: 200,
        width: 200,
        margin: { t: 0, b: 0, l: 0, r: 0 },
        showlegend: false,
        annotations: [
            {
                x: 0.5,
                y: 1.1,
                xref: 'paper',
                yref: 'paper',
                text: `<b>${lengthBetween2025And2030.toLocaleString('de-DE')} m<br>${((lengthBetween2025And2030 / totalLength) * 100).toFixed(1)}%</b>`,
                showarrow: false,
                font: {
                    size: 14,
                    color: 'orange'
                },
                align: 'center'
            }
        ]
    };

    const pieChartBetween2025And2030 = document.createElement('div');
    pieChartBetween2025And2030Container.appendChild(pieChartBetween2025And2030Title);
    pieChartBetween2025And2030Container.appendChild(pieChartBetween2025And2030);
    pieContainer.appendChild(pieChartBetween2025And2030Container);
    Plotly.newPlot(pieChartBetween2025And2030, pieDataBetween2025And2030, pieLayoutBetween2025And2030, { displayModeBar: false });

    document.getElementById('plot').appendChild(pieContainer);

    document.body.style.height = '100vh';
    document.body.style.overflow = 'hidden';
}

// Función para añadir líneas y sombreado
function addLinesAndShading(pkMin, pkMax) {
    let shapes = [];
    for (let year = 1995; year <= 2069; year++) {
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

    shapes.push({
        type: 'rect',
        x0: 2025,
        x1: 2030,
        y0: pkMin,
        y1: pkMax,
        fillcolor: 'rgba(255, 165, 0, 0.1)', // Sombreado tenue naranja
        layer: 'below',
        line: {
            width: 0
        }
    });

    shapes.push({
        type: 'line',
        x0: 2030,
        x1: 2030,
        y0: pkMin,
        y1: pkMax,
        line: {
            color: 'orange',
            width: 2,
            layer: 'above'
        }
    });

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

// Función para dibujar un gráfico específico
async function drawPlot(tram, resumData, estacionsData, containerId = 'plot', addHorizontalLabels = false, pkMin = null, pkMax = null, plotHeight = 500, fixedHeightComponents = 100) {
    let traces = [];
    let stationAnnotations = [];
    let shapes = [];

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
        pkMin = pkMin !== null ? pkMin : Math.min(...via1.concat(via2).map(d => d.PKInici));
        pkMax = pkMax !== null ? pkMax : Math.max(...via1.concat(via2).map(d => d.PKFinal));

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
            hovertext: via1.map(d => `${Math.round(d.length).toLocaleString('de-DE')} m`),
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
                color: 'rgba(135, 206, 250, 1)'
            },
            hoverinfo: 'text',
            hovertext: via2.map(d => `${Math.round(d.length).toLocaleString('de-DE')} m`),
            hoverlabel: {
                bgcolor: 'rgba(135, 206, 250, 1)',
                font: {
                    color: 'white'
                }
            }
        });

        const estaciones = estacionsData.filter(d => d.Tram === tram);

        stationAnnotations.push(...estaciones.map(d => ({
            x: 2072, // Ajustar para que se vean las etiquetas
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
            x1: 2070, // Ajustar para que la línea se vea completa
            y0: parseFloat(d['PK']),
            y1: parseFloat(d['PK']),
            line: {
                color: 'darkgray',
                width: 1.5,
                layer: 'below'
            }
        })));

        shapes = shapes.concat(addLinesAndShading(pkMin, pkMax));
    }

    const layout = {
        title: '',
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
            y: 0.5,
            yanchor: 'middle'
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
        height: plotHeight
    };

    const config = {
        modeBarButtonsToRemove: ['zoom2d', 'pan2d', 'select2d', 'lasso2d', 'zoomIn2d',
            'zoomOut2d', 'autoScale2d', 'resetScale2d', 'hoverClosestCartesian',
            'hoverCompareCartesian', 'toggleSpikelines', 'resetViews', 'toggleHover',
            'toImage'],
        modeBarButtonsToAdd: ['toImage'],
        displaylogo: false,
        displayModeBar: true
    };

    Plotly.newPlot(containerId, traces, layout, config);
}

// Función para seleccionar un botón de tramo
function selectTramButton(button) {
    document.querySelectorAll('.tram-button').forEach(btn => btn.classList.remove('selected'));
    button.classList.add('selected');
}

// Inicializar la página y los eventos
async function init() {
    setupDropdownMenu();

    // Cargar los datos de resumen
    const resumUrl = 'https://raw.githubusercontent.com/cvazquezfgc/planificacio-renovacio-via/main/resum.json';
    resumData = await loadData(resumUrl);
    if (!resumData) {
        console.error('No se pudo cargar el resumen de datos.');
        return;
    }

    // Obtener la lista de tramos
    trams = [...new Set(resumData.map(d => d.TRAM))];
    if (trams.length === 0) {
        console.error('No se encontraron tramos en los datos cargados.');
        return;
    }

    const tramButtonsContainer = document.getElementById('tramButtons');
    if (!tramButtonsContainer) {
        console.error('No se encontró el contenedor de botones de tramo en el DOM.');
        return;
    }

    // Crear los botones de tramos
    tramButtonsContainer.innerHTML = ''; // Limpiar botones anteriores
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

    // Añadir una línea separadora y el botón para "LINIA COMPLETA"
    const separator = document.createElement('div');
    separator.style.width = '2px';
    separator.style.height = '30px';
    separator.style.backgroundColor = 'white';
    separator.style.margin = '0 15px';
    tramButtonsContainer.appendChild(separator);

    const liniaCompletaButton = document.createElement('button');
    liniaCompletaButton.className = 'tram-button';
    liniaCompletaButton.textContent = 'LINIA COMPLETA';
    liniaCompletaButton.addEventListener('click', () => {
        selectTramButton(liniaCompletaButton);
        drawFullLinePlot(trams, resumData);
    });
    tramButtonsContainer.appendChild(liniaCompletaButton);

    // Dibujar el gráfico del primer tramo de la lista por defecto
    const firstTramButton = tramButtonsContainer.querySelector('.tram-button');
    selectTramButton(firstTramButton);
    drawSinglePlot(trams[0], resumData);
}

// Ejecutar cuando el contenido del DOM esté cargado
document.addEventListener('DOMContentLoaded', () => {
    init();
});
