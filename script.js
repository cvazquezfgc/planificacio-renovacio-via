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
let estacionsData = null; // Datos de estaciones
let filteredData = null; // Datos filtrados para la tabla
let activeFilters = {}; // Almacena los filtros aplicados
let currentFilterDropdown = null; // Almacena el dropdown actual

// Función para configurar los botones de navegación
function setupNavButtons() {
    const navButtons = document.querySelectorAll('.nav-button');

    navButtons.forEach(button => {
        button.addEventListener('click', async () => {
            // Cambiar la clase 'selected' al botón clicado
            navButtons.forEach(btn => btn.classList.remove('selected'));
            button.classList.add('selected');

            const selectedView = button.getAttribute('data-view');

            if (selectedView === 'espai-temps') {
                showEspaiTempsView();
            } else if (selectedView === 'taula-inventari') {
                showTaulaInventariView();
            } else if (selectedView === 'necessitats') {
                showNecessitatsView();
            }
        });
    });
}

// Función para mostrar la vista ESPAI-TEMPS
async function showEspaiTempsView() {
    document.getElementById('plot').style.display = 'block';
    document.getElementById('table-container').style.display = 'none';
    document.getElementById('clear-filters-icon').style.display = 'none'; // Ocultar icono de filtros

    // Cargar datos si no se han cargado aún
    if (!resumData) {
        const resumUrl = 'https://raw.githubusercontent.com/cvazquezfgc/planificacio-renovacio-via/main/resum.json';
        resumData = await loadData(resumUrl);
        if (!resumData) {
            console.error('No se pudo cargar el resumen de datos.');
            return;
        }
    }

    // Obtener la lista de tramos
    const trams = [...new Set(resumData.map(d => d.TRAM))];

    drawFullLinePlot(trams, resumData);
}

// Función para mostrar la vista TAULA INVENTARI
async function showTaulaInventariView() {
    document.getElementById('plot').style.display = 'none';
    document.getElementById('table-container').style.display = 'block';
    document.getElementById('clear-filters-icon').style.display = 'block'; // Mostrar icono de filtros

    // Cargar datos si no se han cargado aún
    if (!resumData) {
        const resumUrl = 'https://raw.githubusercontent.com/cvazquezfgc/planificacio-renovacio-via/main/resum.json';
        resumData = await loadData(resumUrl);
        if (!resumData) {
            console.error('No se pudo cargar el resumen de datos.');
            return;
        }
    }

    filteredData = resumData; // Inicialmente, sin filtros
    activeFilters = {}; // Reiniciar filtros
    renderTable(filteredData);
}

// Función para mostrar la vista NECESSITATS D'INVERSIÓ
function showNecessitatsView() {
    document.getElementById('plot').style.display = 'none';
    document.getElementById('table-container').style.display = 'none';
    document.getElementById('clear-filters-icon').style.display = 'none'; // Ocultar icono de filtros

    // Aquí puedes agregar el contenido para NECESSITATS D'INVERSIÓ cuando esté disponible
    const plotContainer = document.getElementById('plot');
    plotContainer.style.display = 'block';
    plotContainer.innerHTML = '<h2 style="text-align: center; margin-top: 50px;">En construcción...</h2>';
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
        th.addEventListener('click', (event) => {
            event.stopPropagation(); // Prevenir que el evento se propague al body
            showFilterDropdown(th, headerText);
        });
        th.style.position = 'relative'; // Para posicionar el filtro debajo
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
    // Si el desplegable actual está abierto y se hace clic en el mismo encabezado, cerrarlo
    if (currentFilterDropdown && currentFilterDropdown.parentElement === th) {
        currentFilterDropdown.remove();
        currentFilterDropdown = null;
        return;
    }

    // Eliminar cualquier otro dropdown abierto
    document.querySelectorAll('.filter-dropdown').forEach(dropdown => dropdown.remove());

    const filterDropdown = document.createElement('div');
    filterDropdown.className = 'filter-dropdown';

    currentFilterDropdown = filterDropdown;

    const uniqueValues = [...new Set(resumData.map(d => String(d[headerText])))].sort();

    // Añadir opción "Seleccionar tot"
    const selectAllLabel = document.createElement('label');
    selectAllLabel.classList.add('bold');
    const selectAllCheckbox = document.createElement('input');
    selectAllCheckbox.type = 'checkbox';
    selectAllCheckbox.value = 'select-all';
    selectAllCheckbox.checked = !activeFilters[headerText] || activeFilters[headerText].length === uniqueValues.length;
    selectAllLabel.appendChild(selectAllCheckbox);
    const selectAllText = document.createTextNode('Seleccionar tot');
    selectAllLabel.appendChild(selectAllText);
    filterDropdown.appendChild(selectAllLabel);

    // Evento para el checkbox "Seleccionar tot"
    selectAllCheckbox.addEventListener('change', () => {
        const checkboxes = filterDropdown.querySelectorAll('input[type="checkbox"]:not([value="select-all"])');
        if (selectAllCheckbox.checked) {
            checkboxes.forEach(cb => cb.checked = true);
        } else {
            checkboxes.forEach(cb => cb.checked = false);
        }
    });

    uniqueValues.forEach(value => {
        const label = document.createElement('label');
        label.style.display = 'flex';
        label.style.alignItems = 'center';
        const checkbox = document.createElement('input');
        checkbox.type = 'checkbox';
        checkbox.value = value;
        checkbox.checked = !activeFilters[headerText] || activeFilters[headerText].includes(value);
        label.appendChild(checkbox);
        const textNode = document.createTextNode(value);
        label.appendChild(textNode);
        filterDropdown.appendChild(label);

        // Evento para actualizar el estado de "Seleccionar tot"
        checkbox.addEventListener('change', () => {
            const checkboxes = filterDropdown.querySelectorAll('input[type="checkbox"]:not([value="select-all"])');
            const allChecked = [...checkboxes].every(cb => cb.checked);
            selectAllCheckbox.checked = allChecked;
        });
    });

    th.appendChild(filterDropdown);

    // Posicionar el dropdown
    filterDropdown.style.left = '0';
    filterDropdown.style.top = `${    th.offsetHeight}px`;

    // Prevenir que el clic dentro del dropdown se propague
    filterDropdown.addEventListener('click', (event) => {
        event.stopPropagation();
    });

    // Ocultar el menú al hacer clic fuera o en el encabezado nuevamente
    function hideFilterDropdown(event) {
        if (!filterDropdown.contains(event.target) && event.target !== th) {
            updateFilters(headerText);
            filterDropdown.remove();
            currentFilterDropdown = null;
            document.removeEventListener('click', hideFilterDropdown);
            applyFilters();
        }
    }
    document.addEventListener('click', hideFilterDropdown);
}

// Función para actualizar los filtros activos
function updateFilters(headerText) {
    const checkboxes = currentFilterDropdown.querySelectorAll('input[type="checkbox"]:not([value="select-all"])');
    const selectedValues = [...checkboxes]
        .filter(checkbox => checkbox.checked)
        .map(checkbox => checkbox.value);

    if (selectedValues.length === checkboxes.length || selectedValues.length === 0) {
        delete activeFilters[headerText];
    } else {
        activeFilters[headerText] = selectedValues;
    }
}

// Función para aplicar los filtros seleccionados
function applyFilters() {
    filteredData = resumData.filter(row => {
        return Object.keys(activeFilters).every(header => {
            const rowValue = String(row[header]);
            return activeFilters[header].includes(rowValue);
        });
    });

    renderTable(filteredData);
}

// Función para limpiar todos los filtros
function clearAllFilters() {
    activeFilters = {};
    filteredData = resumData;
    renderTable(filteredData);
}

// Evento para el icono de limpiar filtros
document.getElementById('clear-filters-icon').addEventListener('click', () => {
    clearAllFilters();
});

// Función para dibujar gráficos concatenados para ESPAI-TEMPS
async function drawFullLinePlot(trams, resumData) {
    document.getElementById('plot').innerHTML = '';

    if (!estacionsData) {
        const estacionsUrl = 'https://raw.githubusercontent.com/cvazquezfgc/planificacio-renovacio-via/main/estacions.json';
        estacionsData = await loadData(estacionsUrl);
        if (!estacionsData) {
            console.error('No se pudo cargar los datos de las estaciones.');
            return;
        }
    }

    const unitHeightPerKm = 54.675; // Reducir un 10% adicional
    const fixedHeightComponents = 100;

    // Calcular minYear y maxYear globales
    const years = resumData.map(d => parseInt(d['PREVISIÓ REHABILITACIÓ'])).filter(year => !isNaN(year));
    const globalMinYear = Math.min(...years) - 1; // Un año antes
    const globalMaxYear = Math.max(...years) + 1; // Un año después

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

        // Etiqueta del tramo
        const labelContainer = document.createElement('div');
        labelContainer.className = 'label-container';
        const label = document.createElement('div');
        label.textContent = tram;
        labelContainer.appendChild(label);

        // Contenedor de los gráficos de quesitos
        const piesContainer = document.createElement('div');
        piesContainer.className = 'pie-charts-container';

        // Crear gráfico de quesito combinado
        const pieChartContainer = document.createElement('div');
        pieChartContainer.className = 'pie-chart-wrapper';

        // Añadir título al gráfico de quesito
        const pieChartTitle = document.createElement('div');
        pieChartTitle.className = 'pie-chart-title';
        pieChartTitle.textContent = 'Any previsió rehabilitació';
        pieChartContainer.appendChild(pieChartTitle);

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

        const lengthAfter2030 = totalLength - lengthBefore2025 - lengthBetween2025And2030;

        const sliceNames = ['<2025', '2025-2030', '>2030'];

        const pieData = [
            {
                values: [lengthBefore2025, lengthBetween2025And2030, lengthAfter2030],
                labels: sliceNames,
                marker: {
                    colors: ['rgba(255, 0, 0, 0.8)', 'rgba(255, 165, 0, 0.8)', 'rgba(200, 200, 200, 0.3)']
                },
                type: 'pie',
                texttemplate: '%{text}',
                text: [getPieLabel(0), getPieLabel(1), getPieLabel(2)],
                textposition: 'outside',
                hoverinfo: 'none',
                rotation: 0,
                direction: 'clockwise',
                sort: false,
                automargin: true,
                outsidetextfont: {
                    size: 12,
                }
            }
        ];

        function getPieLabel(index) {
            const length = [lengthBefore2025, lengthBetween2025And2030, lengthAfter2030][index];
            const percentage = ((length / totalLength) * 100).toFixed(1);
            const sliceName = sliceNames[index];
            return `<b>${sliceName}<br>${percentage}%<br>${length.toLocaleString('de-DE')} m</b>`;
        }

        // Asignar colores de fuente acorde al color del quesito
        pieData[0].textfont = {
            size: 12,
            color: pieData[0].marker.colors.map(color => {
                const rgba = color.match(/rgba?\((\d+), (\d+), (\d+),? ?([\d\.]+)?\)/);
                if (rgba) {
                    const r = rgba[1];
                    const g = rgba[2];
                    const b = rgba[3];
                    return `rgb(${r}, ${g}, ${b})`;
                }
                return 'black';
            })
        };

        const pieLayout = {
            height: 250,
            width: 300, // Aumentar el ancho del gráfico de quesitos
            margin: { t: 0, b: 0, l: 0, r: 0 },
            showlegend: false
        };

        const pieChart = document.createElement('div');
        pieChartContainer.appendChild(pieChart);
        piesContainer.appendChild(pieChartContainer);
        Plotly.newPlot(pieChart, pieData, pieLayout, { displayModeBar: false });

        // Contenedor del gráfico de pirámide
        const pyramidContainer = document.createElement('div');
        pyramidContainer.className = 'pyramid-container';

        // Crear gráfico de pirámide
        const pyramidChartContainer = document.createElement('div');
        pyramidChartContainer.className = 'pyramid-chart-wrapper';

        // Añadir título al gráfico de pirámide
        const pyramidChartTitle = document.createElement('div');
        pyramidChartTitle.className = 'pyramid-chart-title';
        pyramidChartTitle.textContent = 'Piràmide demogràfica de via';
        pyramidChartContainer.appendChild(pyramidChartTitle);

        // Calcular datos para el gráfico de pirámide
        const lustrums = [];
        for (let year = 1995; year <= 2060; year += 5) {
            lustrums.push(`${year}-${year + 4}`);
        }
                lustrums.reverse(); // Para que los más recientes estén abajo

        const via1Lengths = [];
        const via2Lengths = [];
        const totalLengthPerTram = totalLength;

        lustrums.forEach(lustro => {
            const [startYear, endYear] = lustro.split('-').map(Number);
            const via1Length = resumData
                .filter(d => d.TRAM === tram && parseInt(d.Via) === 1 && parseInt(d['PREVISIÓ REHABILITACIÓ']) >= startYear && parseInt(d['PREVISIÓ REHABILITACIÓ']) <= endYear)
                .reduce((sum, d) => sum + (parseFloat(d['PK final']) - parseFloat(d['PK inici'])) * 1000, 0);
            via1Lengths.push(via1Length);

            const via2Length = resumData
                .filter(d => d.TRAM === tram && parseInt(d.Via) === 2 && parseInt(d['PREVISIÓ REHABILITACIÓ']) >= startYear && parseInt(d['PREVISIÓ REHABILITACIÓ']) <= endYear)
                .reduce((sum, d) => sum + (parseFloat(d['PK final']) - parseFloat(d['PK inici'])) * 1000, 0);
            via2Lengths.push(via2Length);
        });

        const pyramidData = [
            {
                x: via1Lengths.map(length => -length / totalLengthPerTram * 100),
                y: lustrums,
                name: 'Via 1',
                orientation: 'h',
                type: 'bar',
                marker: {
                    color: 'rgba(31, 119, 180, 1)'
                },
                hoverinfo: 'none', // Desactivar etiquetas hover
                text: via1Lengths.map(length => length > 0 ? `${(length / totalLengthPerTram * 100).toFixed(1)}%` : ''), // Mostrar porcentaje solo si > 0
                textposition: 'outside', // Etiquetas fuera de las barras
                textfont: {
                    size: 12, // Tamaño de fuente uniforme
                    color: 'rgba(31, 119, 180, 1)' // Color de la fuente que coincide con la vía
                }
            },
            {
                x: via2Lengths.map(length => length / totalLengthPerTram * 100),
                y: lustrums,
                name: 'Via 2',
                orientation: 'h',
                type: 'bar',
                marker: {
                    color: 'rgba(135, 206, 250, 1)'
                },
                hoverinfo: 'none', // Desactivar etiquetas hover
                text: via2Lengths.map(length => length > 0 ? `${(length / totalLengthPerTram * 100).toFixed(1)}%` : ''), // Mostrar porcentaje solo si > 0
                textposition: 'outside', // Etiquetas fuera de las barras
                textfont: {
                    size: 12, // Tamaño de fuente uniforme
                    color: 'rgba(135, 206, 250, 1)' // Color de la fuente que coincide con la vía
                }
            }
        ];

        const pyramidLayout = {
            barmode: 'overlay',
            bargap: 0.1,
            bargroupgap: 0,
            height: 250,
            width: 300, // Aumentar el ancho del gráfico de pirámide
            margin: { t: 0, b: 20, l: 20, r: 20 },
            xaxis: {
                tickvals: [-100, -50, 0, 50, 100],
                ticktext: ['100%', '50%', '0%', '50%', '100%'],
                range: [-100, 100],
                showgrid: false,
                showticklabels: true // Mostrar etiquetas en el eje X
            },
            yaxis: {
                automargin: true,
                tickvals: lustrums.map(lustro => lustro),
                ticktext: lustrums.map(lustro => {
                    const [startYear, endYear] = lustro.split('-');
                    return `${startYear.slice(-2)}-${endYear.slice(-2)}`; // Formato XX-YY
                }),
            },
            showlegend: false,
            hovermode: false // Desactivar modo hover
        };

        const pyramidChart = document.createElement('div');
        pyramidChartContainer.appendChild(pyramidChart);
        pyramidContainer.appendChild(pyramidChartContainer);
        Plotly.newPlot(pyramidChart, pyramidData, pyramidLayout, { displayModeBar: false });

        // Contenedor del gráfico
        const plotContainer = document.createElement('div');
        plotContainer.className = 'plot-container';
        plotContainer.id = `plot-${tram}-chart`;
        plotContainer.style.height = `${tramoHeight}px`;

        // Añadir contenedores al contenedor principal del tramo en el orden correcto
        tramContainer.appendChild(labelContainer);
        tramContainer.appendChild(piesContainer);
        tramContainer.appendChild(pyramidContainer);
        tramContainer.appendChild(plotContainer);

        // Añadir el contenedor del tramo al contenedor principal
        document.getElementById('plot').appendChild(tramContainer);

        // Ahora que el elemento está en el DOM, podemos llamar a drawPlot
        const addHorizontalLabels = true;
        await drawPlot(tram, resumData, estacionsData, plotContainer.id, addHorizontalLabels, pkMin, pkMax, tramoHeight, fixedHeightComponents, globalMinYear, globalMaxYear);
    }

    document.body.style.height = 'auto';
    document.body.style.overflow = 'auto';
}

// Función para añadir líneas y sombreado
function addLinesAndShading(pkMin, pkMax, xRange) {
    let shapes = [];
    for (let year = xRange[0]; year <= xRange[1]; year++) {
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
        x0: xRange[0],
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
async function drawPlot(tram, resumData, estacionsData, containerId = 'plot', addHorizontalLabels = false, pkMin = null, pkMax = null, plotHeight = 500, fixedHeightComponents = 100, minYearOverride = null, maxYearOverride = null) {
    let traces = [];
    let stationAnnotations = [];
    let shapes = [];

    // Determinar el rango de años necesarios
    let minYear = minYearOverride !== null ? minYearOverride : 1995;
    let maxYear = maxYearOverride !== null ? maxYearOverride : 2070;

    const xRange = [minYear, maxYear];

    function groupConsecutiveSegments(data) {
        const groupedData = [];
        let currentGroup = null;

        data.forEach(segment => {
            const pkInici = parseFloat(segment['PK inici']);
            const pkFinal = parseFloat(segment['PK final']);
            const previsio = segment['PREVISIÓ REHABILITACIÓ'];

            if (currentGroup && currentGroup.PKFinal === pkInici && currentGroup.PREVISIO === previsio && currentGroup.via === segment.Via) {
                currentGroup.PKFinal = pkFinal;
                currentGroup.length += (pkFinal - pkInici) * currentGroup.length += (pkFinal - pkInici) * 1000;
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
            x: maxYear - 1, // Ajustado para que las etiquetas se vean
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

        // Líneas de estaciones continuas
        shapes.push(...estaciones.map(d => ({
            type: 'line',
            x0: minYear,
            x1: maxYear,
            y0: parseFloat(d['PK']),
            y1: parseFloat(d['PK']),
            line: {
                color: 'darkgray',
                width: 1.5,
                layer: 'below',
                dash: 'solid' // Línea continua
            }
        })));

        shapes = shapes.concat(addLinesAndShading(pkMin, pkMax, xRange));
    }

    const layout = {
        title: '',
        xaxis: {
            title: addHorizontalLabels ? 'Any previsió rehabilitació' : '',
            range: [minYear, maxYear],
            tickvals: Array.from({ length: maxYear - minYear + 1 }, (_, i) => minYear + i).filter(year => year % 5 === 0),
            tickangle: addHorizontalLabels ? -45 : 0,
            showticklabels: addHorizontalLabels
        },
        yaxis: {
            title: 'PK',
            autorange: 'reversed',
            range: [pkMax, pkMin],
            tickvals: Array.from({ length: Math.ceil(pkMax - pkMin + 1) }, (_, i) => Math.floor(pkMin) + i),
            ticktext: Array.from({ length: Math.ceil(pkMax - pkMin + 1) }, (_, i) => {
                const pkValue = Math.floor(pkMin) + i;
                return `${pkValue}+000`; // Formato x+xxx
            })
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
            r: 100,
            t: 20,
            b: addHorizontalLabels ? 50 : 20
        },
        height: plotHeight,
        autosize: false // Asegúrate de que no ajuste automáticamente
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

// Inicializar la página y los eventos
async function init() {
    setupNavButtons();

    // Por defecto, mostrar la vista ESPAI-TEMPS
    showEspaiTempsView();
}

// Ejecutar cuando el contenido del DOM esté cargado
document.addEventListener('DOMContentLoaded', () => {
    init();
});



