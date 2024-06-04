/* 
This is expenditure.js
Divided into 4 parts:

1. Setup and loading data
2. Calculation of rankings
3. Drawing bar and line chart combo
4. Tooltip handling

*/

/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

/*
1. Setup and loading data
*/

// Ensure the DOM is fully loaded before running the D3 code
document.addEventListener("DOMContentLoaded", function() {
  // Load data for the 1st chart
  d3.json("script/exchangeRates2015.json").then(function(rates) {
      // Convert the currency
      d3.json("script/healthExpenditure.json").then(function(data) {
          const convertedData = data.map(country => {
              const rate = rates[country.Currency]; // convert health expenditure data to local currency
              ['2019', '2020', '2021', '2022'].forEach(year => {
                  country[year] = parseFloat(country[year].replace(/,/g, '')) * rate; // Convert the string to a number and apply the rate
              });
              return country;
          });
          
          // calculate ranks
          const rankings = calculateRankings(convertedData);

          // Extract expenditure data for Australia
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
});

/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

/*
2. Calculation of rankings
*/

// Calculate Australia's rank among OECD countries
function calculateRankings(data) {
  let rankings = { '2019': [], '2020': [], '2021': [], '2022': [] };

  data.forEach(country => {
      Object.keys(rankings).forEach(year => {
          rankings[year].push({ country: country.Country, expenditure: country[year] });
      });
  });

  // sort and assign rank
  Object.keys(rankings).forEach(year => {
      rankings[year].sort((a, b) => b.expenditure - a.expenditure); // sort countries
      let rank = 1;
      // Assign ranks to countries based on expenditure
      rankings[year].forEach((entry, index, arr) => {
          if (index === 0 || entry.expenditure !== arr[index - 1].expenditure) { 
              entry.rank = rank;
          } else {
              entry.rank = arr[index - 1].rank; // assign same rank in case of a tie
          }
          rank++;
      });
      // Log the rankings for the current year
      console.log(`Rankings after assigning ranks for ${year}:`, rankings[year]);
  });

  return rankings;
};

// Extract Australia Data
function extractAustraliaData(rankings) {
  return Object.keys(rankings).map(year => {
      const entry = rankings[year].find(e => e.country === 'Australia'); // finds the Australia for rankings
      return { year, expenditure: entry.expenditure, rank: entry.rank }; // Returns an object with year, expenditure, and rank properties
  });
}

/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

/*
3. Drawing bar and line chart combo
*/

// Draw Bar and Line Chart combo
function BarLineChart(data) {
  // Set dimensions and margins for the graph
  const margin = {top: 50, right: 150, bottom: 100, left: 150},
        width = 960 - margin.left - margin.right,
        height = 650 - margin.top - margin.bottom; 

  // Append the svg object to the body of the page
  const svg = d3.select("#chart1")
                .append("svg")
                .attr("viewBox", `0 0 ${width + margin.left + margin.right} ${height + margin.top + margin.bottom}`) // sets the viewBox attribute
                .attr("width", "100%")
                .attr("height", "100%")
                .attr("preserveAspectRatio", "xMidYMid meet")
                .append("g")
                .attr("transform", "translate(" + margin.left + "," + margin.top + ")");    

  // X axis
  const x = d3.scaleBand()
    .range([ 0, width ])
    .domain(data.map(d => d.year))
    .padding(0.2);
  svg.append("g")
    .attr("transform", "translate(0," + height + ")")
    .call(d3.axisBottom(x))
    .selectAll("text") // Select all the X axis text elements
    .style("font-size", "22px");

  // Add Y axis for expenditure
  const yExpenditure = d3.scaleLinear()
    .domain([0, d3.max(data, d => d.expenditure)])
    .range([ height, 0]);

  svg.append("g")
    .call(d3.axisLeft(yExpenditure))
    .selectAll("text") // Select all the Y axis (right) text elements
    .style("font-size", "16px");

  svg.append("text") // Add label
    .attr("transform", "rotate(-90)")
    .attr("y", 0 - margin.left + 50) // Adjust the position here
    .attr("x", 0 - (height / 2))
    .attr("dy", "0.8em")
    .style("fill", "black") // Change text color to white
    .style("text-anchor", "middle")
    .style("font-size", "24px") // Adjust font size
    .style("font-weight", "bold") // Make text bold
    .text("Expenditure (billion USD)");

  // Y axis for ranking
  const yRank = d3.scaleLinear()
    .domain([d3.max(data, d => d.rank) + 2, 1]) //+1 to lower the line
    .range([ 0, height ]);
  svg.append("g")
    .attr("transform", `translate(${width}, 0)`)
    .call(d3.axisRight(yRank))
    .selectAll("text") // Select all the Y axis (right) text elements
    .style("font-size", "16px");

  svg.append("text") // Add label for Rank
    .attr("transform", "rotate(-90)")
    .attr("y", width + margin.right - 60) // Adjust the position here
    .attr("x", 0 - (height / 2))
    .attr("dy", "0.8em")
    .style("fill", "black") // Change text color to white
    .style("text-anchor", "middle")
    .style("font-size", "24px") // Adjust font size
    .style("font-weight", "bold") // Make text bold
    .text("Rank");

// Bars
svg.selectAll(".bar")
.data(data)
.enter()
.append("rect")
  .attr("x", d => x(d.year))
  .attr("y", d => yExpenditure(d.expenditure))
  .attr("width", x.bandwidth())
  .attr("height", d => height - yExpenditure(d.expenditure))
  .attr("fill", "grey")
  .on("mouseover", function(event, d) { //add mouseover effect
    d3.select(this)
      .attr("fill", "#44AA99"); // change the color of the bar on hover
    d3.select(".tooltip") 
      .html("Expenditure: $" + d.expenditure + "B<br>Rank: " + d.rank)
      .style("visibility", "visible") // display the tooltip when hover over
      .style("top", (event.pageY) + "px") // position the tooltip
      .style("left", (event.pageX) + "px");
  })
  .on("mousemove", function(event) {
    d3.select(".tooltip")
      .style("top", (event.pageY - 10) + "px")
      .style("left", (event.pageX + 10) + "px");
  })
  .on("mouseout", function() {    //mouseover effect
    d3.select(this)
      .attr("fill", "grey"); // reset the color of the bar on mouse out
    d3.select(".tooltip")
      .style("visibility", "hidden"); // hide the tooltip on mouse out
});

// Line
const line = d3.line()
.x(d => x(d.year) + x.bandwidth() / 2)
.y(d => yRank(d.rank));

// Extend the line across the chart
svg.append("line")
.attr("x1", x(data[0].year)) //set starting point
.attr("y1", yRank(data[0].rank))
.attr("x2", x(data[data.length - 1].year) + x.bandwidth())
.attr("y2", yRank(data[data.length - 1].rank))
.attr("stroke", "#FEB8BB")
.attr("stroke-width", 1.5);

svg.append("path")
.datum(data)
.attr("fill", "none") // set color to none
.attr("stroke", "#FEB8BB")
.attr("stroke-width", 1.5) // stroke width
.attr("d", line);

svg.selectAll(".dot")
.data(data)
.enter().append("circle")
.attr("class", "dot")
.attr("cx", d => x(d.year) + x.bandwidth() / 2) // sets x-coordinate to the center
.attr("cy", d => yRank(d.rank))
.attr("r", 5) // radius of the circle
.style("fill", "#F05F80");

/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

/*
4. Tooltip handling
*/

// Tooltip
var tooltip = d3.select("body").append("div")
  .attr("class", "tooltip")
  .style("position", "absolute")
  .style("visibility", "hidden") // set to hidden initially
  .style("background-color", "#FFFFE0") // light yellow background color
  .style("border", "1px solid #000")
  .style("padding", "8px")
  .style("font-size", "16px") // larger font size
  .style("color", "black"); // black text color
};
