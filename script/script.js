d3.json("exchangeRates2015.json").then(function(rates) {
    // Convert the currency
    d3.json('healthExpenditure.json').then(function(data) {
        const convertedData = data.map(country => {
            const rate = rates[country.Currency];
            ['2019', '2020', '2021', '2022'].forEach(year => {
                country[year] = parseFloat(country[year].replace(/,/g, '')) * rate;// Convert the string to a number and apply the rate
            });
        return country;
    });
        // Calculate rankings for Australia
        const rankings = { '2019': [], '2020': [], '2021': [], '2022': [] };
        convertedData.forEach(country => {
            for (const year of ['2019', '2020', '2021', '2022']) {
                rankings[year].push({country: country.Country, expenditure: country[year] });
            }
        });

        Object.keys(rankings).forEach(year => {
            rankings[year].sort((a,b) => b.expenditure - a.expenditure);
            rankings[year] = rankings[year].map((entry, index) => ({
                country: entry.country,
                rank: index + 1,
                expenditure: entry.expenditure
            }));
        });

        const australiaData = Object.keys(rankings).map(year => {
            const entry = rankings[year].find(e => e.country === 'Australia');
            return { year: year, expenditure: entry.expenditure, rank: entry.rank };
        });

        BarLineChart(australiaData);
    });
});

// Draw Bar and Line Chart combo
function BarLineChart(data) {
    // Set dimensions and margins for the graph
    const margin = {top: 30, right: 60, bottom: 70, left: 60},
          width = 960 - margin.left - margin.right,
          height = 500 - margin.top - margin.bottom;

    // Append the svg object to the body of the page
    const svg = d3.select("#chart1")
                  .append("svg")
                  .attr("width", width + margin.left + margin.right)
                  .attr("height", height + margin.top + margin.bottom)
                  .append("g")
                  .attr("transform",
                        "translate(" + margin.left + "," + margin.top + ")");

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
      .call(d3.axisLeft(yExpenditure));

    // Y axis for ranking
    const yRank = d3.scaleLinear()
      .domain([d3.max(data, d => d.rank), 1])
      .range([ height, 0 ]);
    svg.append("g")
      .attr("transform", `translate(${width}, 0)`)
      .call(d3.axisRight(yRank));

    // Bars
    svg.selectAll("mybar")
      .data(data)
      .enter()
      .append("rect")
        .attr("x", d => x(d.year))
        .attr("y", d => yExpenditure(d.expenditure))
        .attr("width", x.bandwidth())
        .attr("height", d => height - yExpenditure(d.expenditure))
        .attr("fill", "#69b3a2");

    // Line
    const line = d3.line()
      .x(d => x(d.year) + x.bandwidth() / 2)
      .y(d => yRank(d.rank));

    svg.append("path")
      .datum(data)
      .attr("fill", "none")
      .attr("stroke", "red")
      .attr("stroke-width", 1.5)
      .attr("d", line);
}