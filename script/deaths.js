/* 
This is deaths.js
Divided into 7 parts:

1. Setup and loading map
2. Loading and processing data
3. Tooltip and interaction functions
4. Creating and updating element of maps
5. Creating and updating deaths and vaccination state bar charts
6. Creating and updating deaths and vaccination default bar charts
7. Function to remove deaths and vaccination bar charts

*/

/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

/*
1. Setup and loading map
*/

// Define initial width and height for the SVG element
var w = 900;
var h = 1000;

// Create SVG element for the map
var svg = d3.select("#map")
    .append("svg")
    .attr("width", w) // Set width of SVG
    .attr("height", h); // Set height of SVG

// Adjust SVG attributes for responsiveness
svg.attr("preserveAspectRatio", "xMidYMid meet") // Preserve aspect ratio
    .attr("viewBox", "0 0 " + w + " " + h) // Set initial viewBox for responsive scaling
    .attr("width", "100%") // Set width to 100% for responsiveness
    .attr("height", "100%"); // Set height to auto for responsiveness

// Set color scale for the map based on death totals
var colorScaleOrdinal = d3.scaleThreshold()
    .domain([0, 1000, 2000, 3000, 4000, 5000, 6000]) // Define thresholds for color scale
    .range(["#fee5d9", "#fcbba1", "#fc9272", "#fb6a4a", "#ef3b2c", "#cb181d", "#a50f15", "#67000d"]); // Define color range

// Set map projection
var projection = d3.geoMercator()
    .center([135, -29.5]) // Center on Australia
    .translate([w / 2, h / 2]) // Translate to center the map within the SVG
    .scale(700); // Set scale for the map

// Create path generator for the map
var path = d3.geoPath().projection(projection);

// Variable to track the selected state
var selectedState = null;

/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

/*
2. Loading and processing deaths and vaccination data
*/

// Load the data files (CSV and JSON)
Promise.all([
    d3.csv("dataset/deaths.csv"),
    d3.csv("dataset/vaccination.csv"),
    d3.json("script/aus.json")
]).then(function (files) {
    var deathData = files[0];
    var vaccinationData = files[1];
    var geoData = files[2];

    // Create objects to store death and vaccination data
    var deathTotals = {};
    var vaccinationTotals = {};
    var stateData = {};

    // Process death data
    deathData.forEach(function (d) {
        deathTotals[d.States] = +d.Total; // Store total deaths by state
        stateData[d.States] = d; // Store detailed data by state
    });

    // Process vaccination data
    vaccinationData.forEach(function (d) {
        vaccinationTotals[d.States] = +d["2024"]; // Store total vaccinations by state for 2024
        if (stateData[d.States]) {
            stateData[d.States].vaccination = d; // Add vaccination data to stateData
        }
    });

    // Create paths for each state on the map
    svg.selectAll("path")
        .data(geoData.features)
        .enter()
        .append("path")
        .attr("d", path) // Set the path data using the projection
        .style("fill", function (d) {
            var stateName = d.properties.name;
            var stateCode = StateCodes[stateName];
            return colorScaleOrdinal(deathTotals[stateCode]); // Set fill color based on death totals
        })
        .style("stroke", "black") // Set stroke color
        .style("stroke-width", "1px") // Set stroke width
        .attr("stateCode", function (d) {
            return StateCodes[d.properties.name]; // Add stateCode as attribute for easy reference
        })

/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

/*
3. Tooltip and interaction functions
*/

        // Add mouseover when mouse hover on state
        .on("mouseover", function (event, d) {
            var stateName = d.properties.name;
            var stateCode = StateCodes[stateName];
            d3.select(this)
                .transition()
                .duration(200)
                .style("fill", function() {
                    return stateCode === selectedState ? "grey" : "black"; // Change color on hover
                });
            showTooltip(event, d); // Show tooltip on hover
        })
        // Add mouseout when mouse out on state
        .on("mouseout", function (event, d) {
            var stateName = d.properties.name;
            var stateCode = StateCodes[stateName];
            if (stateCode !== selectedState) {
                d3.select(this)
                    .transition()
                    .duration(200)
                    .style("fill", colorScaleOrdinal(deathTotals[stateCode])); // Reset color on mouse out
            }
            hideTooltip(); // Hide tooltip on mouse out
        })
        // Add function click on state
        .on("click", function (event, d) {
            var stateName = d.properties.name;
            var stateCode = StateCodes[stateName];
            if (selectedState === stateCode) {
                selectedState = null; // Deselect state
                createDefaultBarChart(deathData, vaccinationData); // Reset to default bar chart
            } else {
                selectedState = stateCode; // Select new state
                updateBarCharts(stateData[stateCode], stateData[stateCode].vaccination, stateName); // Update bar charts for selected state
            }
            svg.selectAll("path")
                .transition()
                .duration(200)
                .style("fill", function (d) {
                    var stateName = d.properties.name;
                    var stateCode = StateCodes[stateName];
                    return stateCode === selectedState ? "grey" : colorScaleOrdinal(deathTotals[stateCode]); // Update fill color based on selection
                });
        });

/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

/*
4. Creating and updating element of maps
*/

    // Add text labels for each state
    svg.selectAll("text")
        .data(geoData.features)
        .enter()
        .append("text")
        .attr("x", function (d) {
            return path.centroid(d)[0]; // Set x position to centroid of state
        })
        .attr("y", function (d) {
            return path.centroid(d)[1]; // Set y position to centroid of state
        })
        .attr("text-anchor", "middle") // Center text
	    .attr("dx", "-0.5em") // Adjust text position horizontally
        .attr("dy", "-0.30em") // Adjust text position vertically
        .text(function (d) {
            return StateCodes[d.properties.name]; // Add state code as text label
        })
        .attr("class", "state-label") // Add class for styling
	    .style("font-size", "14px")
        .style("font-weight", "bold") // Set font weight
        .style("fill", "white"); // Set font color

    // Create legend for the map
    var legend = svg.append("g")
        .attr("transform", "translate(20," + (h - 180) + ")") // Position legend
        .style("fill", "black"); // Set text color

    legend.append("text")
        .attr("x", 120) // Set x position of legend title
        .attr("y", -10) // Set y position of legend title
        .attr("class", "legend-title") // Add class for styling
        .style("font-weight", "bold") // Set font weight
        .style("fill", "black") // Set font color
        .text("Death Cases"); // Set legend title text

    legend.selectAll("rect")
        .data(colorScaleOrdinal.range().slice(1)) // Data for legend rectangles
        .enter()
        .append("rect")
        .attr("x", 120) // Set x position of rectangles
        .attr("y", function (d, i) {
            return i * 20; // Set y position based on index
        })
        .attr("width", 20) // Set width of rectangles
        .attr("height", 20) // Set height of rectangles
        .style("fill", function (d) {
            return d; // Set fill color based on data
        });

    legend.selectAll("text.legend-label")
        .data(colorScaleOrdinal.domain()) // Data for legend labels
        .enter()
        .append("text")
        .attr("x", 150) // Set x position of labels
        .attr("y", function (d, i) {
            return i * 20 + 10; // Set y position based on index
        })
        .attr("dy", ".35em") // Adjust text position vertically
        .attr("class", "legend-label") // Add class for styling
        .text(function (d, i) {
            if (i === colorScaleOrdinal.domain().length - 1) {
                return d + "+"; // Add "+" for the last range
            } else {
                return d + " - " + (colorScaleOrdinal.domain()[i + 1] - 1); // Add range text
            }
        })
        .style("fill", "black"); // Set text color

	// Set the function false
    let tooltipVisible = false;

    function showTooltip(event, d) {
    	const stateName = d.properties.name;
   	    const stateCode = StateCodes[stateName];
    	const totalDeaths = deathTotals[stateCode];
    	const totalVaccinations = (vaccinationTotals[stateCode] / 1000000).toFixed(2); // Convert to millions and format
    	const tooltip = d3.select("#tooltip");
    	tooltip.html(stateName + "<br/>" + "Total Deaths: " + totalDeaths + "<br/>" + "Total Vaccinations: " + totalVaccinations + "M")
        	.style("left", (event.pageX + 10) + "px")
        	.style("top", (event.pageY - 28) + "px");
    
    	if (!tooltipVisible) {
        	tooltip.style("display", "block");
        	tooltipVisible = true;
    }
}

function hideTooltip() {
    d3.select("#tooltip").style("display", "none");
    tooltipVisible = false;
}

///////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

/*
5. Creating and updating deaths and vaccination state bar charts
*/

function updateBarCharts(deathState, vaccinationState, stateName) {
    removeBarCharts(); // Clear previous charts

    // Define years to be displayed on the bar charts
    var years = ["2021", "2022", "2023", "2024"];

    // Extract death values for each year from the deathState object
    var deathValues = years.map(function (year) {
        return +deathState[year];
    });

    // Extract vaccination values for each year from the vaccinationState object and convert to millions
    var vaccinationValues = years.map(function (year) {
        return +vaccinationState[year] / 1000000;  // Convert to millions
    });

    var barWidth = 90; // Width of each bar
    var barHeight = 400; // Height of the chart
    var margin = { top: 100, right: 100, bottom: 70, left: 100 }; // Margins around the chart

    // Death bar chart

    // Define x-scale for the death bar chart
    var xScaleDeath = d3.scaleBand()
        .domain(years) // X-axis labels
        .range([0, years.length * barWidth]) // Scale range
        .padding(0.3); // Padding between bars

    // Define y-scale for the death bar chart
    var yScaleDeath = d3.scaleLinear()
        .domain([0, 4000]) // Y-axis range (max value)
        .range([barHeight, 0]); // Scale range

    // Create SVG element for death bar chart
    var svgDeathBar = d3.select("#death-bar-chart")
        .append("svg")
        .attr("class", "svg-container") // Add a class for styling
        .attr("preserveAspectRatio", "xMidYMid meet") // Preserve aspect ratio
        .attr("viewBox", "0 0 " + (years.length * barWidth + margin.left + margin.right) + " " + (barHeight + margin.top + margin.bottom)) // Set viewBox for initial scaling
        .attr("width", "100%") // Set SVG width to 100%
        .attr("height", "100%") // Set SVG height to 100%
        .append("g")
        .attr("transform", "translate(" + margin.left + "," + margin.top + ")"); // Translate the group element

    // Add chart title
    // svgDeathBar.append("text")
    //     .attr("x", (years.length * barWidth) / 2) // Position in the middle of the chart
    //     .attr("y", -10 - margin.top / 2) // Position above the chart
    //     .attr("text-anchor", "middle") // Center text
    //     .attr("class", "chart-title") // Add class for styling
    //     .text(stateName + " - Death Cases Over Years") // Chart title
    //     .style("font-size", "19px") // Font size
    //     .style("font-weight", "bold") // Font weight
    //     .style("fill", "black"); // Text color

    // Add first line of the chart title for the state name
    svgDeathBar.append("text")
        .attr("x", (years.length * barWidth) / 2) // Position in the middle of the chart
        .attr("y", -10 - margin.top / 2) // Position above the chart
        .attr("text-anchor", "middle") // Center text
        .attr("class", "chart-subtitle") // Add class for styling
        .text("Death Cases Over Years") // Text for the vaccination data
        .style("font-size", "19px") // font size 
        .style("font-weight", "bold") // font weight
        .style("fill", "black"); // Text color
    
    // Add second line of the chart title for the vaccination data description
    svgDeathBar.append("text")
        .attr("x", (years.length * barWidth) / 2) // Position in the middle of the chart
        .attr("y", 10 - margin.top / 2) // Position slightly below the first line
        .attr("text-anchor", "middle") // Center text
        .attr("class", "chart-title") // Add class for styling
        .text(stateName) // Text for the state name
        .style("font-size", "19px") // Font size
        .style("font-weight", "bold") // Font weight
        .style("fill", "black"); // Text color

    // Append rectangles for the death bar chart
    svgDeathBar.selectAll("rect")
        .data(deathValues) // Bind data
        .enter()
        .append("rect")
        .attr("x", function (d, i) { return xScaleDeath(years[i]); }) // X position
        .attr("y", function (d) { return yScaleDeath(d); }) // Y position
        .attr("width", xScaleDeath.bandwidth()) // Width of each bar
        .attr("height", function (d) { return barHeight - yScaleDeath(d); }) // Height of each bar
        .attr("fill", "maroon"); // Bar color

    // Add labels to each bar in the death chart
    svgDeathBar.selectAll("text.bar-label")
        .data(deathValues) // Bind data
        .enter()
        .append("text")
        .attr("class", "bar-label") // Add class for styling
        .attr("x", function (d, i) { return xScaleDeath(years[i]) + xScaleDeath.bandwidth() / 2; }) // X position
        .attr("y", function (d) { return yScaleDeath(d) - 5; }) // Y position
        .attr("text-anchor", "middle") // Center text
        .text(function (d) { return d; }) // Text content
        .style("fill", "black") // Text color
        .style("font-size", "18px"); // Font size

    // Add x-axis to the death bar chart
    svgDeathBar.append("g")
        .attr("transform", "translate(0," + barHeight + ")") // Position at the bottom of the chart
        .call(d3.axisBottom(xScaleDeath)) // Call bottom axis
        .selectAll("text")
        .style("font-size", "20px") // Increase font size for x-axis labels
        .style("fill", "black"); // Text color

    // Add y-axis to the death bar chart
    svgDeathBar.append("g")
        .call(d3.axisLeft(yScaleDeath)) // Call left axis
        .selectAll("text")
        .style("font-size", "18px") // Increase font size for y-axis labels
        .style("fill", "black"); // Text color

    // Vaccination bar chart

    // Define x-scale for the vaccination bar chart
    var xScaleVaccination = d3.scaleBand()
        .domain(years) // X-axis labels
        .range([0, years.length * barWidth]) // Scale range
        .padding(0.3); // Padding between bars

    // Define y-scale for the vaccination bar chart
    var yScaleVaccination = d3.scaleLinear()
        .domain([0, 25]) // Y-axis range (max value in millions)
        .range([barHeight, 0]); // Scale range

    // Create SVG element for vaccination bar chart
    var svgVaccinationBar = d3.select("#vaccination-bar-chart")
        .append("svg")
        .attr("class", "svg-container") // Add a class for styling
        .attr("preserveAspectRatio", "xMidYMid meet") // Preserve aspect ratio
        .attr("viewBox", "0 0 " + (years.length * barWidth + margin.left + margin.right) + " " + (barHeight + margin.top + margin.bottom)) // Set viewBox for initial scaling
        .attr("width", "100%") // Set SVG width to 100%
        .attr("height", "100%") // Set SVG height to 100%
        .append("g")
        .attr("transform", "translate(" + margin.left + "," + margin.top + ")"); // Translate the group element

    // Add chart title
    // svgVaccinationBar.append("text")
    //     .attr("x", (years.length * barWidth) / 2) // Position in the middle of the chart
    //     .attr("y", -10 - margin.top / 2) // Position above the chart
    //     .attr("text-anchor", "middle") // Center text
    //     .attr("class", "chart-title") // Add class for styling
    //     .text(stateName + " - Vaccination Doses Over Years (Millions)") // Chart title
    //     .style("font-size", "19px") // Font size
    //     .style("font-weight", "bold") // Font weight
    //     .style("fill", "black"); // Text color

        // Add first line of the chart title for the state name
        svgVaccinationBar.append("text")
            .attr("x", (years.length * barWidth) / 2) // Position in the middle of the chart
            .attr("y", -10 - margin.top / 2) // Position above the chart
            .attr("text-anchor", "middle") // Center text
            .attr("class", "chart-subtitle") // Add class for styling
            .text("Vaccination Doses Over Years (Millions)") // Text for the vaccination data
            .style("font-size", "19px") // font size
            .style("font-weight", "bold") // font weights
            .style("fill", "black"); // Text color
    
        // Add second line of the chart title for the vaccination data description
        svgVaccinationBar.append("text")
            .attr("x", (years.length * barWidth) / 2) // Position in the middle of the chart
            .attr("y", 10 - margin.top / 2) // Position slightly below the first line
            .attr("text-anchor", "middle") // Center text
            .attr("class", "chart-title") // Add class for styling
            .text(stateName) // Text for the state name
            .style("font-size", "19px") // Font size
            .style("font-weight", "bold") // Font weight
            .style("fill", "black"); // Text color

    // Append rectangles for the vaccination bar chart
    svgVaccinationBar.selectAll("rect")
        .data(vaccinationValues) // Bind data
        .enter()
        .append("rect")
        .attr("x", function (d, i) { return xScaleVaccination(years[i]); }) // X position
        .attr("y", function (d) { return yScaleVaccination(d); }) // Y position
        .attr("width", xScaleVaccination.bandwidth()) // Width of each bar
        .attr("height", function (d) { return barHeight - yScaleVaccination(d); }) // Height of each bar
        .attr("fill", "#1434A4"); // Bar color

    // Add labels to each bar in the vaccination chart
    svgVaccinationBar.selectAll("text.bar-label")
        .data(vaccinationValues) // Bind data
        .enter()
        .append("text")
        .attr("class", "bar-label") // Add class for styling
        .attr("x", function (d, i) { return xScaleVaccination(years[i]) + xScaleVaccination.bandwidth() / 2; }) // X position
        .attr("y", function (d) { return yScaleVaccination(d) - 5; }) // Y position
        .attr("text-anchor", "middle") // Center text
        .text(function (d) { return d.toFixed(2) + "M"; }) // Text content
        .style("fill", "black") // Text color
        .style("font-size", "18px"); // Font size

    // Add x-axis to the vaccination bar chart
    svgVaccinationBar.append("g")
        .attr("transform", "translate(0," + barHeight + ")") // Position at the bottom of the chart
        .call(d3.axisBottom(xScaleVaccination)) // Call bottom axis
        .selectAll("text")
        .style("font-size", "18px") // Increase font size for x-axis labels
        .style("fill", "black"); // Text color

// Add y-axis to the vaccination bar chart
svgVaccinationBar.append("g")
    .call(d3.axisLeft(yScaleVaccination)) // Call left axis
    .selectAll("text")
    .style("font-size", "18px") // Increase font size for y-axis labels
    .style("fill", "black"); // Text color
}

///////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

/*
6. Creating and updating deaths and vaccination default bar charts
*/

function createDefaultBarChart(deathData, vaccinationData) {
removeBarCharts(); // Clear previous charts

// Define years to be displayed on the bar charts
var years = ["2021", "2022", "2023", "2024"];

// Calculate total death values for each year, correcting for doubling
var deathValues = years.map(function (year) {
    return d3.sum(deathData, function (d) { return +d[year]; }) / 2; // Divide by 2 to correct the doubling
});

// Calculate total vaccination values for each year, correcting for doubling and converting to millions
var vaccinationValues = years.map(function (year) {
    return d3.sum(vaccinationData, function (d) { return +d[year]; }) / (2 * 1000000); // Divide by 2 and 1 million to correct the doubling and convert to millions
});

var barWidth = 90; // Width of each bar
var barHeight = 400; // Height of the chart
var margin = { top: 100, right: 100, bottom: 70, left: 100 }; // Margins around the chart

// Death bar chart

// Define x-scale for the death bar chart
var xScaleDeath = d3.scaleBand()
    .domain(years) // X-axis labels
    .range([0, years.length * barWidth]) // Scale range
    .padding(0.3); // Padding between bars

// Define y-scale for the death bar chart
var yScaleDeath = d3.scaleLinear()
    .domain([0, 11000]) // Y-axis range (max value)
    .range([barHeight, 0]); // Scale range

// Create SVG element for death bar chart
var svgDeathBar = d3.select("#death-bar-chart")
    .append("svg")
    .attr("class", "svg-container") // Add a class for styling
    .attr("preserveAspectRatio", "xMidYMid meet") // Preserve aspect ratio
    .attr("viewBox", "0 0 " + (years.length * barWidth + margin.left + margin.right) + " " + (barHeight + margin.top + margin.bottom)) // Set viewBox for initial scaling
    .attr("width", "100%") // Set SVG width to 100%
    .attr("height", "100%") // Set SVG height to 100%
    .append("g")
    .attr("transform", "translate(" + margin.left + "," + margin.top + ")"); // Translate the group element

// Add chart title
svgDeathBar.append("text")
    .attr("x", (years.length * barWidth) / 2) // Position in the middle of the chart
    .attr("y", -10 - margin.top / 2) // Position above the chart
    .attr("text-anchor", "middle") // Center text
    .attr("class", "chart-title") // Add class for styling
    .text("Total Death Cases in Australia Over Years") // Chart title
    .style("font-size", "19px") // Font size
    .style("font-weight", "bold") // Font weight
    .style("fill", "black"); // Text color

// Append rectangles for the death bar chart
svgDeathBar.selectAll("rect")
    .data(deathValues) // Bind data
    .enter()
    .append("rect")
    .attr("x", function (d, i) { return xScaleDeath(years[i]); }) // X position
    .attr("y", function (d) { return yScaleDeath(d); }) // Y position
    .attr("width", xScaleDeath.bandwidth()) // Width of each bar
    .attr("height", function (d) { return barHeight - yScaleDeath(d); }) // Height of each bar
    .attr("fill", "maroon"); // Bar color

// Add labels to each bar in the death chart
svgDeathBar.selectAll("text.bar-label")
    .data(deathValues) // Bind data
    .enter()
    .append("text")
    .attr("class", "bar-label") // Add class for styling
    .attr("x", function (d, i) { return xScaleDeath(years[i]) + xScaleDeath.bandwidth() / 2; }) // X position
    .attr("y", function (d) { return yScaleDeath(d) - 5; }) // Y position
    .attr("text-anchor", "middle") // Center text
    .text(function (d) { return d; }) // Text content
    .style("fill", "black") // Text color
    .style("font-size", "18px"); // Font size

// Add x-axis to the death bar chart
svgDeathBar.append("g")
    .attr("transform", "translate(0," + barHeight + ")") // Position at the bottom of the chart
    .call(d3.axisBottom(xScaleDeath)) // Call bottom axis
    .selectAll("text")
    .style("font-size", "18px") // Increase font size for x-axis labels
    .style("fill", "black"); // Text color

// Add y-axis to the death bar chart
svgDeathBar.append("g")
    .call(d3.axisLeft(yScaleDeath)) // Call left axis
    .selectAll("text")
    .style("font-size", "18px") // Increase font size for y-axis labels
    .style("fill", "black"); // Text color

// Vaccination bar chart

// Define x-scale for the vaccination bar chart
var xScaleVaccination = d3.scaleBand()
    .domain(years) // X-axis labels
    .range([0, years.length * barWidth]) // Scale range
    .padding(0.3); // Padding between bars

// Define y-scale for the vaccination bar chart
var yScaleVaccination = d3.scaleLinear()
    .domain([0, 75]) // Y-axis range (max value in millions)
    .range([barHeight, 0]); // Scale range

// Create SVG element for vaccination bar chart
var svgVaccinationBar = d3.select("#vaccination-bar-chart")
    .append("svg")
    .attr("class", "svg-container") // Add a class for styling
    .attr("preserveAspectRatio", "xMidYMid meet") // Preserve aspect ratio
    .attr("viewBox", "0 0 " + (years.length * barWidth + margin.left + margin.right) + " " + (barHeight + margin.top + margin.bottom)) // Set viewBox for initial scaling
    .attr("width", "100%") // Set SVG width to 100%
    .attr("height", "100%") // Set SVG height to 100%
    .append("g")
    .attr("transform", "translate(" + margin.left + "," + margin.top + ")"); // Translate the group element

// Add chart title
svgVaccinationBar.append("text")
    .attr("x", (years.length * barWidth) / 2) // Position in the middle of the chart
    .attr("y", -10 - margin.top / 2) // Position above the chart
    .attr("text-anchor", "middle") // Center text
    .attr("class", "chart-title") // Add class for styling
    .text("Total Vaccination Doses in Australia Over Years (Millions)") // Chart title
    .style("font-size", "19px") // Font size
    .style("font-weight", "bold") // Font weight
    .style("fill", "black"); // Text color

// Append rectangles for the vaccination bar chart
svgVaccinationBar.selectAll("rect")
    .data(vaccinationValues) // Bind data
    .enter()
    .append("rect")
    .attr("x", function (d, i) { return xScaleVaccination(years[i]); }) // X position
    .attr("y", function (d) { return yScaleVaccination(d); }) // Y position
    .attr("width", xScaleVaccination.bandwidth()) // Width of each bar
    .attr("height", function (d) { return barHeight - yScaleVaccination(d); }) // Height of each bar
    .attr("fill", "#1434A4"); // Bar color

// Add labels to each bar in the vaccination chart
svgVaccinationBar.selectAll("text.bar-label")
    .data(vaccinationValues) // Bind data
    .enter()
    .append("text")
    .attr("class", "bar-label") // Add class for styling
    .attr("x", function (d, i) { return xScaleVaccination(years[i]) + xScaleVaccination.bandwidth() / 2; }) // X position
    .attr("y", function (d) { return yScaleVaccination(d) - 5; }) // Y position
    .attr("text-anchor", "middle") // Center text
    .text(function (d) { return d.toFixed(2) + "M"; }) // Text content with million unit
    .style("fill", "black") // Text color
    .style("font-size", "18px"); // Font size

// Add x-axis to the vaccination bar chart
svgVaccinationBar.append("g")
    .attr("transform", "translate(0," + barHeight + ")") // Position at the bottom of the chart
    .call(d3.axisBottom(xScaleVaccination)) // Call bottom axis
    .selectAll("text")
    .style("font-size", "18px") // Increase font size for x-axis labels
    .style("fill", "black"); // Text color

// Add y-axis to the vaccination bar chart
svgVaccinationBar.append("g")
    .call(d3.axisLeft(yScaleVaccination)) // Call left axis
    .selectAll("text")
    .style("font-size", "18px") // Increase font size for y-axis labels
    .style("fill", "black"); // Text color
}

createDefaultBarChart(deathData, vaccinationData);

///////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

/*
7. Function to remove deaths and vaccination bar charts
*/

function removeBarCharts() {
    d3.select("#death-bar-chart").selectAll("*").remove();
    d3.select("#vaccination-bar-chart").selectAll("*").remove();
}
});
