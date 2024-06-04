// Load data for the 1st chart
d3.json("./script/exchangeRates2015.json").then(function(rates) {
    // Convert the currency
    d3.json("./script/healthExpenditure.json").then(function(data) {
        const convertedData = data.map(country => {
            const rate = rates[country.Currency];
            ['2019', '2020', '2021', '2022'].forEach(year => {
                country[year] = parseFloat(country[year].replace(/,/g, '')) * rate;// Convert the string to a number and apply the rate
            });
        return country;
        });

        const rankings = calculateRankings(convertedData);

        const australiaData = ['2019', '2020', '2021', '2022'].map(year => {
            const entry = rankings[year].find(e => e.country === 'Australia');
            return { year, expenditure: entry.expenditure, rank: entry.rank };
        });

        BarLineChart(australiaData);

        console.log(australiaData);

    }).catch(error => {
      console.error('Error fetching or processing data:', error);
    });
});

// Load data and GeoJSON for the 2nd chart
d3.json("./script/australian-states.json").then(function(geoData) {
  d3.csv("./dataset/COVID-19-deaths-lga.csv").then(function(deathData) {
    // Process death data for the charts
    const deathsByRegion = {};
    deathData.forEach(d => {
      deathsByRegion[d.STATE_NAME] = +d.Total.replace(/,/g, ''); // Remove , and convert to number
      deathsByRegion[d.STATE_NAME] = {
        '2021': +d['2021'].replace(/,/g, ''),
        '2022': +d['2022'].replace(/,/g, ''),
        '2023': +d['2023'].replace(/,/g, ''),
        '2024': +d['2024'].replace(/,/g, ''),
        'Total': +d.Total.replace(/,/g, '')  // Remove commas
      };
    });

    d3.csv("./dataset/vaccination.csv").then(function(vaccinationData) {
      // Process vaccination data
      const vaccinationsByRegion = {};
      vaccinationData.forEach(d => {
        vaccinationsByRegion[d.STATE_NAME] = {
          '2021': +d['2021'],
          '2022': +d['2022'],
          '2023': +d['2023'],
          '2024': +d['2024']
        };
      });
      
      // Create map
      drawMap(geoData, deathsByRegion, vaccinationsByRegion);

      //Default Australia data for the two-sided bar chart
      const defaultData = combineData(deathsByRegion, vaccinationsByRegion,'Aus');
      drawBarChart(defaultData);
      // // Handle click events on the map
      // function onSelectedLGA(lga) {
      //   const stateData = data.filter(d => d.region === lga);
      //   updateBarChart(stateData);
      // }
    });
  });
});


// Calculate Australia's rank among OECD countries
function calculateRankings(data) {
  let rankings = { '2019': [], '2020': [], '2021': [], '2022': [] };
  
  data.forEach(country => {
      Object.keys(rankings).forEach(year => {
          rankings[year].push({ country: country.Country, expenditure: country[year] });
      });
  });

  Object.keys(rankings).forEach(year => {
      rankings[year].sort((a, b) => b.expenditure - a.expenditure);
      let rank = 1;
        rankings[year].forEach((entry, index, arr) => {
            if (index === 0 || entry.expenditure !== arr[index - 1].expenditure) {
                entry.rank = rank;
            } else {
                entry.rank = arr[index - 1].rank; // Assign same rank in case of a tie
            }
            rank++;
        });
        console.log(`Rankings after assigning ranks for ${year}:`, rankings[year]);
    });

    return rankings;
};

// Extract Australia Data
function extractAustraliaData(rankings) {
  return Object.keys(rankings).map(year => {
    const entry = rankigs[year].find(e => e.country === 'Australia');
    return { year, expenditure: entry.expenditure, rank: entry.rank};
  });
}

// Draw Bar and Line Chart combo
function BarLineChart(data) {
    // Set dimensions and margins for the graph
    const margin = {top: 30, right: 100, bottom: 70, left: 100},
          width = 960 - margin.left - margin.right,
          height = 500 - margin.top - margin.bottom;

    // Append the svg object to the body of the page
    const svg = d3.select("#chart1")
                  .append("svg")
                  .attr("viewBox", `0 0 ${width + margin.left + margin.right} ${height + margin.top + margin.bottom}`)
                  .attr("width", width + margin.left + margin.right)
                  .attr("height", height + margin.top + margin.bottom)
                  .append("g")
                  .attr("transform", "translate(" + margin.left + "," + margin.top + ")");

    // X axis
    const x = d3.scaleBand()
      .range([ 0, width ])
      .domain(data.map(d => d.year))
      .padding(0.2);
    svg.append("g")
      .attr("transform", "translate(0," + height + ")")
      .call(d3.axisBottom(x));

    // Add Y axis for expenditure
    const yExpenditure = d3.scaleLinear()
      .domain([0, d3.max(data, d => d.expenditure)])
      .range([ height, 0]);

    svg.append("g")
      .call(d3.axisLeft(yExpenditure))
    svg.append("text") // Add label
      .attr("transform", "rotate(-90)")
      .attr("y", 0 - margin.left + 20)
      .attr("x", 0 - (height / 2))
      .attr("dy", "0.8em")
      .style("fill", "#ffffff")
      .style("text-anchor", "middle")
      .text("Expenditure (million USD)");

    // Y axis for ranking
    const yRank = d3.scaleLinear()
      .domain([d3.max(data, d => d.rank) + 2, 1]) //+1 to lower the line
      .range([ 0, height ]);
    svg.append("g")
      .attr("transform", `translate(${width}, 0)`)
      .call(d3.axisRight(yRank))
    svg.append("text") // Add label
      .attr("transform", "rotate(-90)")
      .attr("y", width + margin.right - 40)
      .attr("x", 0 - (height / 2))
      .attr("dy", "0.8em")
      .style("fill", "#ffffff")
      .style("text-anchor", "middle")
      .text("Rank");;

    // Bars
    svg.selectAll(".bar")
      .data(data)
      .enter()
      .append("rect")
        .attr("x", d => x(d.year))
        .attr("y", d => yExpenditure(d.expenditure))
        .attr("width", x.bandwidth())
        .attr("height", d => height - yExpenditure(d.expenditure))
        .attr("fill", "#F9F1DB")
        .on("mouseover", function(event, d) { //add mouseover effect
          d3.select(this)
            .attr("fill", "#44AA99"); // change the color of the bar on hover
          d3.select(".tooltip") 
            .html("Expenditure: $" + d.expenditure + "M<br>Rank: " + d.rank)
            .style("visibility", "visible") // display the tooltip when hover over
            .style("top", (event.pageY) + "px") // position the tooltip
            .style("left", (event.pageX) + "px");
        })
        .on("mousemove", function(event) {
          d3.select(".tooltip")
            .style("top", (event.pageY - 10) + "px")
            .style("left", (event.pageX +10) + "px");
        })
        .on("mouseout", function() {    //mouseover effect
          d3.select(this)
            .attr("fill", "#F9F1DB"); // reset the color of the bar on mouse out
          d3.select(".tooltip")
            .style("visibility", "hidden"); // hide the tooltip on mouse out
      });
    
    // Line
    const line = d3.line()
      .x(d => x(d.year) + x.bandwidth() / 2)
      .y(d => yRank(d.rank));

    // Extend the line across the chart
    svg.append("line")
      .attr("x1", x(data[0].year))
      .attr("y1", yRank(data[0].rank))
      .attr("x2", x(data[data.length - 1].year) + x.bandwidth())
      .attr("y2", yRank(data[data.length - 1].rank))
      .attr("stroke", "#FEB8BB")
      .attr("stroke-width", 1.5);

    svg.append("path")
      .datum(data)
      .attr("fill", "none")
      .attr("stroke", "#FEB8BB")
      .attr("stroke-width", 1.5)
      .attr("d", line);

    svg.selectAll(".dot")
      .data(data)
      .enter().append("circle")
      .attr("class", "dot")
      .attr("cx", d => x(d.year) + x.bandwidth() / 2)
      .attr("cy", d => yRank(d.rank))
      .attr("r", 5)
      .style("fill", "#F05F80");

    // Tooltip
    var tooltip = d3.select("body").append("div")
        .attr("class", "tooltip")
        .style("position", "absolute")
        .style("visibility", "hidden")
        .style("background-color", "white")
        .style("border", "1px solid #000")
        .style("padding", "8px");
};

// Draw choropleth map
function drawMap(geoData, deathsByRegion, vaccinationsByRegion) {

  console.log("GeoData:", geoData);  // Debug: Log the geoData to check its structure
  console.log("Deaths by Region:", deathsByRegion);  // Debug: Log the processed deaths data
  const width = 960;
  const height = 500;
  const minDeaths = d3.min(Object.values(deathsByRegion).map(d => d.Total));
  const maxDeaths = d3.max(Object.values(deathsByRegion).map(d => d.Total));
  console.log("Min deaths:", minDeaths);
  console.log("Max deaths:", maxDeaths);

  const colorScale = d3.scaleQuantize()
                      .domain([minDeaths, maxDeaths])
                      .range(['#eedbff', '#dbc3f1', '#c2a5df', '#b595d4', '#a27ec6', '#8159af', '#7c52ab', '#683d9d', '#54278f']);
  
  const projection = d3.geoMercator()
                        .fitSize([width, height], geoData);

  const path = d3.geoPath()
                  .projection(projection);

  const svg = d3.select("#chart2").append("svg")
                .attr("width", width)
                .attr("height", height);

  svg.selectAll('path')
    .data(geoData.features)
    .enter()
    .append("path")
      .attr("d", path)
      .attr("fill", d => {
        const deaths = deathsByRegion[d.properties.STATE_NAME].Total;
        return deaths ? colorScale(deaths) : '#000'; // Use a default color if no data exists

        // const color = deaths ? colorScale(deaths) : '#000'; // Use a default color if no data exists
        // Log the state name, deaths, and color for debugging
        // console.log(d.properties.STATE_NAME, "Deaths:", deaths, "Color:", color);
        // return color;
      })
      .on("click", function(event, d) {
        const stateData = combineData(deathsByRegion, vaccinationsByRegion, d.properties.STATE_NAME)

        console.log("State Data for " + d.properties.STATE_NAME + ":", stateData); // Debugging
        // const deaths = deathsByRegion[d.properties.STATE_NAME];
        // Update the bar chart based on the clicked region
        updateBarChart(stateData);
      });
}

// Combine death and vaccination data for the bar chart
function combineData(deathsByRegion, vaccinationsByRegion, state) {
  const years = ['2021', '2022', '2023', '2024'];
  return years.map(year => ({
    year: year,
    deaths: deathsByRegion[state][year],
    vaccinations: vaccinationsByRegion[state][year]
  }));
}

// Draw the two-side bar chart
function drawBarChart(data) {
  const margin = {top: 30, right: 50, bottom: 70, left: 50},
        width = 960 - margin.left - margin.right,
        height = 500 - margin.top - margin.bottom;

  const svg = d3.select("#chart3").append("svg")
                .attr("width", width + margin.left + margin.right)
                .attr("height", height + margin.top + margin.bottom)
                .append("g")
                .attr("transform", "translate(" + margin.left + "," + margin.top + ")");

  const maxDeaths = d3.max(data, d => d.deaths);
  const maxVaccinations = d3.max(data, d => d.vaccinations);
  const maxVal = Math.max(maxDeaths, maxVaccinations);

  // x-axis for years
  const x = d3.scaleBand()
              .domain(data.map(d => d.year))
              .range([0, width])
              .padding(0.2);

  const y = d3.scaleLinear()
              .domain([0, maxVal])
              .range([height, 0]);

  // Left y-axis for Death data
  const yLeft = d3.scaleLinear()
                  .domain([0, maxDeaths])
                  .range([height, 0]);

  // Right y-axis for Vaccination data
  const yRight = d3.scaleLinear()
                    .domain([0, maxVal])
                    .range([height, 0]);

  svg.append("g")
     .attr("class", "x axis")
     .attr("transform", "translate(0," + height + ")")
     .call(d3.axisBottom(x));

  svg.append("g")
     .attr("class", "y axis left")
     .call(d3.axisLeft(yLeft));

  svg.append("g")
     .attr("class", "y axis right")
     .attr("transform", "translate(" + width + " ,0)")   
     .call(d3.axisRight(yRight));

  // Bars for deaths
  svg.selectAll(".bar.deaths")
     .data(data)
     .enter().append("rect")
     .attr("class", "bar deaths")
     .attr("x", d => x(d.year))
     .attr("y", d => yLeft(d.deaths))
     .attr("width", x.bandwidth() / 2)
     .attr("height", d => height - yLeft(d.deaths))
     .attr("fill", "#8A75BF");

  // Bars for vaccinations
  svg.selectAll(".bar.vaccinations")
     .data(data)
     .enter().append("rect")
     .attr("class", "bar vaccinations")
     .attr("x", d => x(d.year) + x.bandwidth() / 2)
     .attr("y", d => yRight(d.vaccinations))
     .attr("width", x.bandwidth() / 2)
     //.attr("height", d => height - yRight(d.vaccinations))
     .attr("height", d => {
      console.log("Vaccinations bar:", d.vaccinations, height - y(d.vaccinations));
      return height - y(d.vaccinations);
    })
     .attr("fill", "#D2EDB5");
}


// function updateBarChart(data) {
//   // Remove the existing SVG if any
//   d3.select("#chart3").select("svg").remove();
//   drawBarChart(data);
// }

// Update bar chart when clicking
function updateBarChart(data) {
  const margin = {top: 30, right: 50, bottom: 70, left: 50},
        width = 960 - margin.left - margin.right,
        height = 500 - margin.top - margin.bottom;

  const maxDeaths = d3.max(data, d => d.deaths);
  const maxVaccinations = d3.max(data, d => d.vaccinations);
  const maxVal = Math.max(maxDeaths, maxVaccinations);

  // x-axis for years
  const x = d3.scaleBand()
              .domain(data.map(d => d.year))
              .range([0, width])
              .padding(0.2);

  // Left y-axis for Death data
  const yLeft = d3.scaleLinear()
                  .domain([0, maxDeaths])
                  .range([height, 0]);

  // Right y-axis for Vaccination data
  const yRight = d3.scaleLinear()
                    .domain([0, maxVal])
                    .range([height, 0]);

  const svg = d3.select("#chart3").select("svg").select("g");
  
  // Death bar transition 
  svg.selectAll(".bar.deaths")
     .data(data)
     .transition()
     .duration(750)
     .attr("x", d => x(d.year))
     .attr("y", d => yLeft(d.deaths))
     .attr("height", d => height - yLeft(d.deaths));

  // Vaccination bar transition
  svg.selectAll(".bar.vaccinations")
     .data(data)
     .transition()
     .duration(750)
     .attr("x", d => x(d.year) + x.bandwidth() / 2)
     .attr("y", d => yRight(d.vaccinations))
     .attr("height", d => height - yRight(d.vaccinations));

  // Update the axes + add transitions when clicking regions
  svg.select(".x.axis")
     .transition()
     .duration(750)
     .call(d3.axisBottom(x));

  svg.select(".y.axis.left")
     .transition()
     .duration(750)
     .call(d3.axisLeft(yLeft));

  svg.select(".y.axis.right")
     .transition()
     .duration(750)
     .call(d3.axisRight(yRight));
}