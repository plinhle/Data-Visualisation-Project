var w = 900;
var h = 1000;

var svg = d3.select("#map")
    .append("svg")
    .attr("width", w)
    .attr("height", h);

// Set color scale
var colorScaleOrdinal = d3.scaleThreshold()
    .domain([0, 1000, 2000, 3000, 4000, 5000, 6000])
    .range(["#fee5d9", "#fcbba1", "#fc9272", "#fb6a4a", "#ef3b2c", "#cb181d", "#a50f15", "#67000d"]);

// Set map projection
var projection = d3.geoMercator()
    .center([135, -29.5])
    .translate([w / 2, h / 2])
    .scale(1000);

var path = d3.geoPath().projection(projection);

// Track the selection state of each state
var selectedState = null;

// Load the CSV data
Promise.all([
    d3.csv("dataset/deaths.csv"),
    d3.csv("dataset/vaccination.csv"),
    d3.json("script/aus.json")
]).then(function (files) {
    var deathData = files[0];
    var vaccinationData = files[1];
    var geoData = files[2];

    var deathTotals = {};
    var vaccinationTotals = {};
    var stateData = {};

    deathData.forEach(function (d) {
        deathTotals[d.States] = +d.Total;
        stateData[d.States] = d;
    });

    vaccinationData.forEach(function (d) {
        vaccinationTotals[d.States] = +d["2024"];  // Adjusted to use 2024 total
        if (stateData[d.States]) {
            stateData[d.States].vaccination = d;
        }
    });

    svg.selectAll("path")
        .data(geoData.features)
        .enter()
        .append("path")
        .attr("d", path)
        .style("fill", function (d) {
            var stateName = d.properties.name;
            var stateCode = StateCodes[stateName];
            return colorScaleOrdinal(deathTotals[stateCode]);
        })
        .style("stroke", "black")
        .style("stroke-width", "1px")
        .attr("stateCode", function (d) {
            return StateCodes[d.properties.name];
        })
        .on("mouseover", function (event, d) {
            var stateName = d.properties.name;
            var stateCode = StateCodes[stateName];
            d3.select(this)
                .transition()
                .duration(200)
                .style("fill", function() {
                    return stateCode === selectedState ? "grey" : "black";
                });
            showTooltip(event, d);
        })
        .on("mouseout", function (event, d) {
            var stateName = d.properties.name;
            var stateCode = StateCodes[stateName];
            if (stateCode !== selectedState) {
                d3.select(this)
                    .transition()
                    .duration(200)
                    .style("fill", colorScaleOrdinal(deathTotals[stateCode]));
            }
            hideTooltip();
        })
        .on("click", function (event, d) {
            var stateName = d.properties.name;
            var stateCode = StateCodes[stateName];
            if (selectedState === stateCode) {
                selectedState = null;
                createDefaultBarChart(deathData, vaccinationData);
            } else {
                selectedState = stateCode;
                updateBarCharts(stateData[stateCode], stateData[stateCode].vaccination, stateName);
            }
            svg.selectAll("path")
                .transition()
                .duration(200)
                .style("fill", function (d) {
                    var stateName = d.properties.name;
                    var stateCode = StateCodes[stateName];
                    return stateCode === selectedState ? "grey" : colorScaleOrdinal(deathTotals[stateCode]);
                });
        });

    svg.selectAll("text")
        .data(geoData.features)
        .enter()
        .append("text")
        .attr("x", function (d) {
            return path.centroid(d)[0];
        })
        .attr("y", function (d) {
            return path.centroid(d)[1];
        })
        .attr("text-anchor", "middle")
        .attr("dy", ".35em")
        .text(function (d) {
            return StateCodes[d.properties.name];
        })
        .attr("class", "state-label")
        .style("font-weight", "bold")
        .style("fill", "white");

    var legend = svg.append("g")
        .attr("transform", "translate(20," + (h - 180) + ")")
        .style("fill", "black");

    legend.append("text")
        .attr("x", 120)
        .attr("y", -10)
        .attr("class", "legend-title")
        .style("font-weight", "bold")
        .style("fill", "black")
        .text("Death Cases");

    legend.selectAll("rect")
        .data(colorScaleOrdinal.range().slice(1))
        .enter()
        .append("rect")
        .attr("x", 120)
        .attr("y", function (d, i) {
            return i * 20;
        })
        .attr("width", 20)
        .attr("height", 20)
        .style("fill", function (d) {
            return d;
        });

    legend.selectAll("text.legend-label")
        .data(colorScaleOrdinal.domain())
        .enter()
        .append("text")
        .attr("x", 150)
        .attr("y", function (d, i) {
            return i * 20 + 10;
        })
        .attr("dy", ".35em")
        .attr("class", "legend-label")
        .text(function (d, i) {
            if (i === colorScaleOrdinal.domain().length - 1) {
                return d + "+";
            } else {
                return d + " - " + (colorScaleOrdinal.domain()[i + 1] - 1);
            }
        })
        .style("fill", "black");

    function showTooltip(event, d) {
        var stateName = d.properties.name;
        var stateCode = StateCodes[stateName];
        var totalDeaths = deathTotals[stateCode];
        var totalVaccinations = (vaccinationTotals[stateCode] / 1000000).toFixed(2); // Convert to millions and format
        var tooltip = d3.select("#tooltip");
        tooltip.html(stateName + "<br/>" + "Total Deaths: " + totalDeaths + "<br/>" + "Total Vaccinations: " + totalVaccinations + "M")
            .style("left", (event.pageX + 10) + "px")
            .style("top", (event.pageY - 28) + "px")
            .style("display", "block")
            .style("color", "black")
            .style("background-color", "white")
            .style("font-size", "16px")
            .style("position", "absolute");
    }

    function hideTooltip() {
        d3.select("#tooltip").style("display", "none");
    }

    function updateBarCharts(deathState, vaccinationState, stateName) {
        removeBarCharts(); // Clear previous charts
        var years = ["2021", "2022", "2023", "2024"];
        var deathValues = years.map(function (year) {
            return +deathState[year];
        });
        var vaccinationValues = years.map(function (year) {
            return +vaccinationState[year] / 1000000;  // Convert to millions
        });

        var barWidth = 90;
        var barHeight = 400;
        var margin = { top: 100, right: 100, bottom: 70, left: 100 };

        // Death bar chart
        var xScaleDeath = d3.scaleBand()
            .domain(years)
            .range([0, years.length * barWidth])
            .padding(0.3);

        var yScaleDeath = d3.scaleLinear()
            .domain([0, 4000])
            .range([barHeight, 0]);

        var svgDeathBar = d3.select("#death-bar-chart")
            .append("svg")
            .attr("width", years.length * barWidth + margin.left + margin.right)
            .attr("height", barHeight + margin.top + margin.bottom)
            .append("g")
            .attr("transform", "translate(" + margin.left + "," + margin.top + ")");

        svgDeathBar.append("text")
            .attr("x", (years.length * barWidth) / 2)
            .attr("y", -10 - margin.top / 2)
            .attr("text-anchor", "middle")
            .attr("class", "chart-title")
            .text(stateName + " - Death Cases Over Years")
            .style("font-weight", "bold")
            .style("fill", "black");

        svgDeathBar.selectAll("rect")
            .data(deathValues)
            .enter()
            .append("rect")
            .attr("x", function (d, i) { return xScaleDeath(years[i]); })
            .attr("y", function (d) { return yScaleDeath(d); })
            .attr("width", xScaleDeath.bandwidth())
            .attr("height", function (d) { return barHeight - yScaleDeath(d); })
            .attr("fill", "maroon");

        svgDeathBar.selectAll("text.bar-label")
            .data(deathValues)
            .enter()
            .append("text")
            .attr("class", "bar-label")
            .attr("x", function (d, i) { return xScaleDeath(years[i]) + xScaleDeath.bandwidth() / 2; })
            .attr("y", function (d) { return yScaleDeath(d) - 5; })
            .attr("text-anchor", "middle")
            .text(function (d) { return d; })
            .style("fill", "black")
            .style("font-size", "18px");

        svgDeathBar.append("g")
            .attr("transform", "translate(0," + barHeight + ")")
            .call(d3.axisBottom(xScaleDeath))
            .selectAll("text")
            .style("font-size", "20px") // Increase font size for x-axis labels
            .style("fill", "black");

        svgDeathBar.append("g")
            .call(d3.axisLeft(yScaleDeath))
            .selectAll("text")
            .style("font-size", "18px") // Increase font size for y-axis labels
            .style("fill", "black");

        // Vaccination bar chart
        var xScaleVaccination = d3.scaleBand()
            .domain(years)
            .range([0, years.length * barWidth])
            .padding(0.3);

        var yScaleVaccination = d3.scaleLinear()
            .domain([0, 25])
            .range([barHeight, 0]);

        var svgVaccinationBar = d3.select("#vaccination-bar-chart")
            .append("svg")
            .attr("width", years.length * barWidth + margin.left + margin.right)
            .attr("height", barHeight + margin.top + margin.bottom)
            .append("g")
            .attr("transform", "translate(" + margin.left + "," + margin.top + ")");

        svgVaccinationBar.append("text")
            .attr("x", (years.length * barWidth) / 2)
            .attr("y", -10 - margin.top / 2)
            .attr("text-anchor", "middle")
            .attr("class", "chart-title")
            .text(stateName + " - Vaccination Cases Over Years (Millions)")
            .style("font-weight", "bold")
            .style("fill", "black");

        svgVaccinationBar.selectAll("rect")
            .data(vaccinationValues)
            .enter()
            .append("rect")
            .attr("x", function (d, i) { return xScaleVaccination(years[i]); })
            .attr("y", function (d) { return yScaleVaccination(d); })
            .attr("width", xScaleVaccination.bandwidth())
            .attr("height", function (d) { return barHeight - yScaleVaccination(d); })
            .attr("fill", "#1434A4");

        svgVaccinationBar.selectAll("text.bar-label")
            .data(vaccinationValues)
            .enter()
            .append("text")
            .attr("class", "bar-label")
            .attr("x", function (d, i) { return xScaleVaccination(years[i]) + xScaleVaccination.bandwidth() / 2; })
            .attr("y", function (d) { return yScaleVaccination(d) - 5; })
            .attr("text-anchor", "middle")
            .text(function (d) { return d.toFixed(2) + "M"; })
            .style("fill", "black")
            .style("font-size", "18px");

        svgVaccinationBar.append("g")
            .attr("transform", "translate(0," + barHeight + ")")
            .call(d3.axisBottom(xScaleVaccination))
            .selectAll("text")
            .style("font-size", "18px") // Increase font size for x-axis labels
            .style("fill", "black");

        svgVaccinationBar.append("g")
            .call(d3.axisLeft(yScaleVaccination))
            .selectAll("text")
            .style("font-size", "18px") // Increase font size for y-axis labels
            .style("fill", "black");
    }

    function createDefaultBarChart(deathData, vaccinationData) {
    removeBarCharts(); // Clear previous charts
    var years = ["2021", "2022", "2023", "2024"];
    var deathValues = years.map(function (year) {
        return d3.sum(deathData, function (d) { return +d[year]; }) / 2; // Divide by 2 to correct the doubling
    });
    var vaccinationValues = years.map(function (year) {
        return d3.sum(vaccinationData, function (d) { return +d[year]; }) / (2 * 1000000); // Divide by 2 and 1 million to correct the doubling and convert to millions
    });

        var barWidth = 90;
        var barHeight = 400;
        var margin = { top: 100, right: 100, bottom: 70, left: 100 };

        // Death bar chart
        var xScaleDeath = d3.scaleBand()
            .domain(years)
            .range([0, years.length * barWidth])
            .padding(0.3);

        var yScaleDeath = d3.scaleLinear()
            .domain([0, 11000])
            .range([barHeight, 0]);

        var svgDeathBar = d3.select("#death-bar-chart")
            .append("svg")
            .attr("width", years.length * barWidth + margin.left + margin.right)
            .attr("height", barHeight + margin.top + margin.bottom)
            .append("g")
            .attr("transform", "translate(" + margin.left + "," + margin.top + ")");

        svgDeathBar.append("text")
            .attr("x", (years.length * barWidth) / 2)
            .attr("y", -10 - margin.top / 2)
            .attr("text-anchor", "middle")
            .attr("class", "chart-title")
            .text("Total Death Cases in Australia Over Years")
            .style("font-weight", "bold")
            .style("fill", "black");

        svgDeathBar.selectAll("rect")
            .data(deathValues)
            .enter()
            .append("rect")
            .attr("x", function (d, i) { return xScaleDeath(years[i]); })
            .attr("y", function (d) { return yScaleDeath(d); })
            .attr("width", xScaleDeath.bandwidth())
            .attr("height", function (d) { return barHeight - yScaleDeath(d); })
            .attr("fill", "maroon");

        svgDeathBar.selectAll("text.bar-label")
            .data(deathValues)
            .enter()
            .append("text")
            .attr("class", "bar-label")
            .attr("x", function (d, i) { return xScaleDeath(years[i]) + xScaleDeath.bandwidth() / 2; })
            .attr("y", function (d) { return yScaleDeath(d) - 5; })
            .attr("text-anchor", "middle")
            .text(function (d) { return d; })
            .style("fill", "black")
            .style("font-size", "18px");

        svgDeathBar.append("g")
            .attr("transform", "translate(0," + barHeight + ")")
            .call(d3.axisBottom(xScaleDeath))
            .selectAll("text")
            .style("font-size", "18px") // Increase font size for x-axis labels
            .style("fill", "black");

        svgDeathBar.append("g")
            .call(d3.axisLeft(yScaleDeath))
            .selectAll("text")
            .style("font-size", "18px") // Increase font size for y-axis labels
            .style("fill", "black");

        // Vaccination bar chart
        var xScaleVaccination = d3.scaleBand()
            .domain(years)
            .range([0, years.length * barWidth])
            .padding(0.3);

        var yScaleVaccination = d3.scaleLinear()
            .domain([0, 75])
            .range([barHeight, 0]);

        var svgVaccinationBar = d3.select("#vaccination-bar-chart")
            .append("svg")
            .attr("width", years.length * barWidth + margin.left + margin.right)
            .attr("height", barHeight + margin.top + margin.bottom)
            .append("g")
            .attr("transform", "translate(" + margin.left + "," + margin.top + ")");

        svgVaccinationBar.append("text")
            .attr("x", (years.length * barWidth) / 2)
            .attr("y", -10 - margin.top / 2)
            .attr("text-anchor", "middle")
            .attr("class", "chart-title")
            .text("Total Vaccination Doses in Australia Over Years (Millions)")
            .style("font-weight", "bold")
            .style("fill", "black");

        svgVaccinationBar.selectAll("rect")
            .data(vaccinationValues)
            .enter()
            .append("rect")
            .attr("x", function (d, i) { return xScaleVaccination(years[i]); })
            .attr("y", function (d) { return yScaleVaccination(d); })
            .attr("width", xScaleVaccination.bandwidth())
            .attr("height", function (d) { return barHeight - yScaleVaccination(d); })
            .attr("fill", "#1434A4");

        svgVaccinationBar.selectAll("text.bar-label")
            .data(vaccinationValues)
            .enter()
            .append("text")
            .attr("class", "bar-label")
            .attr("x", function (d, i) { return xScaleVaccination(years[i]) + xScaleVaccination.bandwidth() / 2; })
            .attr("y", function (d) { return yScaleVaccination(d) - 5; })
            .attr("text-anchor", "middle")
            .text(function (d) { return d.toFixed(2) + "M"; })
            .style("fill", "black")
            .style("font-size", "18px");

        svgVaccinationBar.append("g")
            .attr("transform", "translate(0," + barHeight + ")")
            .call(d3.axisBottom(xScaleVaccination))
            .selectAll("text")
            .style("font-size", "18px") // Increase font size for x-axis labels
            .style("fill", "black");

        svgVaccinationBar.append("g")
            .call(d3.axisLeft(yScaleVaccination))
            .selectAll("text")
            .style("font-size", "18px") // Increase font size for y-axis labels
            .style("fill", "black");
    }

    createDefaultBarChart(deathData, vaccinationData);

    function removeBarCharts() {
        d3.select("#death-bar-chart").selectAll("*").remove();
        d3.select("#vaccination-bar-chart").selectAll("*").remove();
    }
});
