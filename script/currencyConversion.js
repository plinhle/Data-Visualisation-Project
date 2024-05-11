const healthExpenditure = require('./healthExpenditure.json');
const exchangeRates = require('./exchangeRates2015.json');

function convertToUSD(data, rates) {
    return data.map(item => {
        const rate = rates[item.Currency];
        ['2019', '2020', '2021', '2022'].forEach(year => {
            const amount = parseFloat(item[year].replace(/,/g, ''));
                item[year] = (amount * rate).toFixed(2); // Convert the string to a number and apply the rate
        });
        return item;
    });
}

const convertedData = convertToUSD(healthExpenditure, exchangeRates);
console.log(convertedData);
