// Global variables
let svg, g, xScale, yScale, colorScale, line, tooltip;
let width, height, margin;
let currentData = [];
let selectedGenres = new Set();

// Initialize the visualization
document.addEventListener('DOMContentLoaded', function() {
    console.log('DOM loaded, initializing chart...');
    
    // Try to load the actual data file, fall back to sample data if not available
    d3.json('genre_trends_data.json')
        .then(function(data) {
            console.log('Data loaded successfully:', data);
            currentData = data;
            initializeChart(data);
        })
        .catch(function(error) {
            console.warn('Could not load genre_trends_data.json, using sample data:', error);
            // Use sample data as fallback
            currentData = generateSampleData();
            console.log('Sample data generated:', currentData);
            initializeChart(currentData);
        });
});

// Generate sample data that matches the structure of the real data
function generateSampleData() {
    const genres = ["Drama", "Comedy", "Action", "Thriller", "Adventure", "Crime", "Romance", "Science Fiction"];
    const baseValues = {
        "Drama": 150,
        "Comedy": 120,
        "Action": 100,
        "Thriller": 80,
        "Adventure": 70,
        "Crime": 60,
        "Romance": 50,
        "Science Fiction": 40
    };
    
    return genres.map(genre => {
        const values = [];
        for (let year = 1990; year <= 2017; year++) {
            // Create realistic trend with some randomness
            const trend = (year - 1990) * (genre === "Action" ? 2 : genre === "Science Fiction" ? 1.5 : 0.5);
            const seasonal = Math.sin((year - 1990) * 0.5) * 10;
            const random = Math.random() * 20 - 10;
            const count = Math.max(5, Math.floor(baseValues[genre] + trend + seasonal + random));
            
            values.push({
                year: year,
                count: count
            });
        }
        return {
            genre: genre,
            values: values
        };
    });
}

function initializeChart(data) {
    console.log('Initializing chart with data:', data);
    
    // Check if container exists
    const container = document.querySelector('.chart-container');
    if (!container) {
        console.error('Chart container not found!');
        return;
    }
    
    // Set dimensions and margins
    margin = {top: 20, right: 100, bottom: 60, left: 70};
    const containerWidth = container.offsetWidth || 1140;
    width = containerWidth - margin.left - margin.right;
    height = 500 - margin.top - margin.bottom;
    
    console.log('Chart dimensions:', { width, height, containerWidth });

    // Clear any existing chart
    d3.select("#chart").selectAll("*").remove();

    // Set up SVG
    svg = d3.select("#chart")
        .attr("viewBox", `0 0 ${width + margin.left + margin.right} ${height + margin.top + margin.bottom}`)
        .attr("preserveAspectRatio", "xMidYMid meet");

    g = svg.append("g")
        .attr("transform", `translate(${margin.left},${margin.top})`);

    // Set up scales
    xScale = d3.scaleLinear()
        .domain([1990, 2017])
        .range([0, width]);

    yScale = d3.scaleLinear()
        .domain([0, d3.max(data, d => d3.max(d.values, v => v.count)) * 1.1])
        .range([height, 0]);

    // Color scale with better colors
    const genreColors = {
        "Drama": "#e74c3c",
        "Comedy": "#f39c12",
        "Action": "#3498db",
        "Thriller": "#9b59b6",
        "Adventure": "#1abc9c",
        "Crime": "#34495e",
        "Romance": "#e91e63",
        "Science Fiction": "#2ecc71",
        "Fantasy": "#00bcd4",
        "Horror": "#795548"
    };

    colorScale = d3.scaleOrdinal()
        .domain(data.map(d => d.genre))
        .range(data.map(d => genreColors[d.genre] || "#95a5a6"));

    // Initialize selected genres (all selected by default)
    data.forEach(d => selectedGenres.add(d.genre));

    // Add gradient definitions for a more polished look
    const defs = svg.append("defs");
    
    data.forEach(d => {
        const gradient = defs.append("linearGradient")
            .attr("id", `gradient-${d.genre.replace(/\s+/g, '-')}`)
            .attr("gradientUnits", "userSpaceOnUse")
            .attr("x1", 0).attr("y1", yScale(0))
            .attr("x2", 0).attr("y2", yScale(d3.max(d.values, v => v.count)));
        
        gradient.append("stop")
            .attr("offset", "0%")
            .attr("stop-color", colorScale(d.genre))
            .attr("stop-opacity", 0.1);
        
        gradient.append("stop")
            .attr("offset", "100%")
            .attr("stop-color", colorScale(d.genre))
            .attr("stop-opacity", 0.3);
    });

    // Add grid
    g.append("g")
        .attr("class", "grid")
        .attr("transform", `translate(0,${height})`)
        .call(d3.axisBottom(xScale)
            .ticks(10)
            .tickSize(-height)
            .tickFormat("")
        );

    g.append("g")
        .attr("class", "grid")
        .call(d3.axisLeft(yScale)
            .ticks(8)
            .tickSize(-width)
            .tickFormat("")
        );

    // Add X axis
    g.append("g")
        .attr("class", "axis x-axis")
        .attr("transform", `translate(0,${height})`)
        .call(d3.axisBottom(xScale)
            .tickFormat(d3.format("d"))
            .ticks(10)
        );

    // Add Y axis
    g.append("g")
        .attr("class", "axis y-axis")
        .call(d3.axisLeft(yScale));

    // Add axis labels
    g.append("text")
        .attr("class", "axis-label")
        .attr("transform", "rotate(-90)")
        .attr("y", 0 - margin.left + 15)
        .attr("x", 0 - (height / 2))
        .style("text-anchor", "middle")
        .text("Number of Movies");

    g.append("text")
        .attr("class", "axis-label")
        .attr("x", width / 2)
        .attr("y", height + margin.bottom - 10)
        .style("text-anchor", "middle")
        .text("Year");

    // Line generator
    line = d3.line()
        .x(d => xScale(d.year))
        .y(d => yScale(d.count))
        .curve(d3.curveMonotoneX);

    // Area generator for filled areas under lines
    const area = d3.area()
        .x(d => xScale(d.year))
        .y0(height)
        .y1(d => yScale(d.count))
        .curve(d3.curveMonotoneX);

    // Tooltip
    tooltip = d3.select(".tooltip");

    // Add areas (filled regions under lines)
    const areas = g.selectAll(".genre-area")
        .data(data)
        .enter().append("g")
        .attr("class", "genre-area");

    areas.append("path")
        .attr("class", "area")
        .attr("d", d => area(d.values))
        .style("fill", d => `url(#gradient-${d.genre.replace(/\s+/g, '-')})`)
        .style("opacity", 0.3);

    // Add lines
    const lines = g.selectAll(".genre-line")
        .data(data)
        .enter().append("g")
        .attr("class", "genre-line");

    lines.append("path")
        .attr("class", d => `line line-${d.genre.replace(/\s+/g, '-')}`)
        .attr("d", d => line(d.values))
        .style("stroke", d => colorScale(d.genre))
        .attr("stroke-dasharray", function() { return this.getTotalLength(); })
        .attr("stroke-dashoffset", function() { return this.getTotalLength(); })
        .transition()
        .duration(2000)
        .ease(d3.easeCubicInOut)
        .attr("stroke-dashoffset", 0);

    // Add interactive overlay for hover effects
    const mouseG = g.append("g")
        .attr("class", "mouse-over-effects");

    mouseG.append("path")
        .attr("class", "mouse-line")
        .style("stroke", "#999")
        .style("stroke-width", "1px")
        .style("opacity", "0");

    const mousePerLine = mouseG.selectAll('.mouse-per-line')
        .data(data)
        .enter()
        .append("g")
        .attr("class", "mouse-per-line");

    mousePerLine.append("circle")
        .attr("r", 5)
        .style("stroke", d => colorScale(d.genre))
        .style("fill", "white")
        .style("stroke-width", "2px")
        .style("opacity", "0");

    // Add rect to capture mouse movements
    mouseG.append('svg:rect')
        .attr('width', width)
        .attr('height', height)
        .attr('fill', 'none')
        .attr('pointer-events', 'all')
        .on('mouseout', function() {
            d3.select(".mouse-line").style("opacity", "0");
            d3.selectAll(".mouse-per-line circle").style("opacity", "0");
            tooltip.transition().duration(200).style("opacity", 0);
        })
        .on('mouseover', function() {
            d3.select(".mouse-line").style("opacity", "0.5");
            d3.selectAll(".mouse-per-line circle").style("opacity", "1");
        })
        .on('mousemove', function(event) {
            const mouse = d3.pointer(event);
            const xYear = Math.round(xScale.invert(mouse[0]));
            
            if (xYear >= 1990 && xYear <= 2017) {
                d3.select(".mouse-line")
                    .attr("d", `M${mouse[0]},${height} ${mouse[0]},0`);

                d3.selectAll(".mouse-per-line")
                    .attr("transform", function(d) {
                        const yearData = d.values.find(v => v.year === xYear);
                        if (yearData && selectedGenres.has(d.genre)) {
                            d3.select(this).select("circle").style("opacity", "1");
                            return `translate(${xScale(xYear)},${yScale(yearData.count)})`;
                        } else {
                            d3.select(this).select("circle").style("opacity", "0");
                            return `translate(${xScale(xYear)},${height})`;
                        }
                    });

                // Update tooltip
                let tooltipHtml = `<strong>Year ${xYear}</strong><br/>`;
                data.forEach(d => {
                    if (selectedGenres.has(d.genre)) {
                        const yearData = d.values.find(v => v.year === xYear);
                        if (yearData) {
                            tooltipHtml += `<span style="color: ${colorScale(d.genre)}">${d.genre}: ${yearData.count}</span><br/>`;
                        }
                    }
                });

                tooltip.transition().duration(50).style("opacity", .95);
                tooltip.html(tooltipHtml)
                    .style("left", (event.pageX + 15) + "px")
                    .style("top", (event.pageY - 28) + "px");
            }
        });

    // Create legend
    createLegend(data);
}

function createLegend(data) {
    const legend = d3.select("#legend");
    legend.selectAll("*").remove();
    
    data.forEach(d => {
        const legendItem = legend.append("div")
            .attr("class", "legend-item active")
            .on("click", function() {
                toggleGenre(d.genre, this);
            });
        
        legendItem.append("div")
            .attr("class", "legend-color")
            .style("background-color", colorScale(d.genre));
        
        legendItem.append("div")
            .attr("class", "legend-text")
            .text(d.genre);
    });
}

function toggleGenre(genre, element) {
    const isActive = selectedGenres.has(genre);
    
    if (isActive) {
        selectedGenres.delete(genre);
        d3.select(element).classed("dimmed", true).classed("active", false);
    } else {
        selectedGenres.add(genre);
        d3.select(element).classed("dimmed", false).classed("active", true);
    }
    
    // Update line visibility
    d3.select(`.line-${genre.replace(/\s+/g, '-')}`)
        .classed("dimmed", isActive);
    
    // Update area visibility
    g.selectAll(".area")
        .filter(d => d.genre === genre)
        .style("opacity", isActive ? 0 : 0.3);
}

// Control functions
function resetView() {
    // Reset all genres to visible
    currentData.forEach(d => selectedGenres.add(d.genre));
    
    d3.selectAll(".line").classed("dimmed", false);
    d3.selectAll(".legend-item").classed("dimmed", false).classed("active", true);
    d3.selectAll(".area").style("opacity", 0.3);
    
    // Reset x-axis to full range
    xScale.domain([1990, 2017]);
    updateChart();
}

function animateLines() {
    d3.selectAll(".line")
        .attr("stroke-dasharray", function() { return this.getTotalLength(); })
        .attr("stroke-dashoffset", function() { return this.getTotalLength(); })
        .transition()
        .duration(2500)
        .ease(d3.easeCubicInOut)
        .attr("stroke-dashoffset", 0);
}

function showAllYears() {
    xScale.domain([1990, 2017]);
    updateChart();
}

function show2000s() {
    xScale.domain([2000, 2009]);
    updateChart();
}

function show2010s() {
    xScale.domain([2010, 2017]);
    updateChart();
}

function updateChart() {
    // Update x-axis
    g.select(".x-axis")
        .transition()
        .duration(750)
        .call(d3.axisBottom(xScale).tickFormat(d3.format("d")));
    
    // Update grid
    g.select(".grid")
        .transition()
        .duration(750)
        .call(d3.axisBottom(xScale)
            .ticks(10)
            .tickSize(-height)
            .tickFormat("")
        );
    
    // Update lines
    g.selectAll(".line")
        .transition()
        .duration(750)
        .attr("d", d => line(d.values));
    
    // Update areas
    const area = d3.area()
        .x(d => xScale(d.year))
        .y0(height)
        .y1(d => yScale(d.count))
        .curve(d3.curveMonotoneX);
    
    g.selectAll(".area")
        .transition()
        .duration(750)
        .attr("d", d => area(d.values));
}
