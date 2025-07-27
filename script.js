class Weather {
    constructor() {
        this.init();
        this.uvChart = null;
        this.latitude = null;
        this.longitude = null;
    }

    init() {
        this.updateDateTime();
        this.loadWeather();

        //Update the time every second
        setInterval(() => this.updateDateTime(), 1000);

        // Add retry button event
        const retryBtn = document.getElementById('retry-btn');
        if (retryBtn) {
            retryBtn.addEventListener('click', () => this.loadWeather());
        }
    }


    updateDateTime() {
        const now = new Date();
        const time = now.toLocaleTimeString([], {
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit'
        });
        const date = now.toLocaleDateString([], {
            weekday: 'long',
            month: 'short',
            day: 'numeric'
        });

        const timeElement = document.getElementById('time');
        const dateElement = document.getElementById('date');

        if (timeElement) timeElement.textContent = `Current time: ${time}`;
        if (dateElement) dateElement.textContent = date;
    }

    showLoading() {
        document.getElementById('loading').style.display = 'block';
        document.getElementById('weather-info').style.display = 'none';
        document.getElementById('error').style.display = 'none';
    }

    showWeather() {
        document.getElementById('loading').style.display = 'none';
        document.getElementById('weather-info').style.display = 'block';
        document.getElementById('error').style.display = 'none';
    }

    showError() {
        document.getElementById('loading').style.display = 'none';
        document.getElementById('weather-info').style.display = 'none';
        document.getElementById('error').style.display = 'block';
    }

    async loadWeather() {
        this.showLoading();
        try {
            await this.getLocation();
        } catch (error) {
            console.error('Failed to load the weather', error);
            this.showError();
        }
    }

    async getLocation() {
        return new Promise((resolve, reject) => {
            const success = (position) => {
                this.latitude = position.coords.latitude;
                this.longitude = position.coords.longitude;

                console.log(`Location: ${this.latitude}, ${this.longitude}`);

                // Call all weather-related functions
                Promise.all([
                this.getWeather(this.longitude, this.latitude),
                this.getLocationName(this.latitude, this.longitude),
                this.getUVData(this.latitude, this.longitude),
                this.day7forecast(this.latitude, this.longitude),
                ]).then(() => {
                    this.showWeather();
                    resolve();
                })
            };

            const error = (err) => {
                console.error('Geolocation error:', err);
            }

            if (navigator.geolocation) {
                navigator.geolocation.getCurrentPosition(
                    success,
                    error,
                    {timeout: 10000, enableHighAccuracy: true}
                );
            } else {
                reject(new Error('Geolocation is not supported'));
            }
        });
    }

    /**
     * Gets the current weather for a given location.
     * @param {number} longitude - The longitude of the location.
     * @param {number} latitude - The latitude of the location.
     * @returns {Promise<void>} Resolves when the data is retrieved and the UI is updated.
     */
    async getWeather(longitude, latitude) {
        const url = `https://api.open-meteo.com/v1/forecast?latitude=${latitude}&longitude=${longitude}&hourly=temperature_2m,relative_humidity_2m,apparent_temperature&current_weather=true&timezone=auto`;

        const res = await fetch(url);
        const record = await res.json();

        const temps = record.hourly.temperature_2m;
        const humidity = record.hourly.relative_humidity_2m;
        const feelsLike = record.hourly.apparent_temperature;

        // Get current hour
        const now = new Date();
        const hours = now.getHours();

        // Convert Celsius to Fahrenheit
        const currentTempC = temps[hours];
        const currentTempF = Math.round(currentTempC * (9/5) + 32);
        const feelsLikeC = feelsLike[hours];
        const feelsLikeF = Math.round(feelsLikeC * (9/5) + 32);
        const currentHumidity = Math.round(humidity[hours]);

        // Update UI
        document.getElementById('currentTemp').textContent = currentTempF;
        document.getElementById('feelsLike').textContent = feelsLikeF + '°F';
        document.getElementById('humidity').textContent = currentHumidity + '%';

        // Update background and alert
        this.changeBackground(currentTempF);
        this.updateAlertBanner(currentTempF);
    }

    /**
     * Updates the alert banner on the page.
     *
     * @param {number} temp - The current temperature in Fahrenheit
     */
    updateAlertBanner(temp) {
        const alertText = document.getElementById('alertText');
        const alertIcon = document.getElementById('alertIcon');

        if (temp >= 90) {
            alertIcon.textContent = '🚨';
            alertText.textContent = `EXTREME HEAT`;
        } else if (temp >= 80) {
            alertIcon.textContent = '🔥';
            alertText.textContent = `HEAT WARNING`;
        } else {
            alertIcon.textContent = '😎';
            alertText.textContent = `Pleasant weather`;
        }
    }

    /**
     * Updates the background color of the page based on the given temperature.
     *
     * @param {number} temp - The temperature in Fahrenheit.
     */
    changeBackground(temp) {
        document.body.className = '';
        if (temp >= 90) {
            document.body.classList.add('extreme');
        } else if (temp >= 80) {
            document.body.classList.add('hot');
        } else {
            document.body.classList.add('cold');
        }
    }

    /**
     * Given a latitude and longitude, fetches the city name from the API and updates the UI with the name.
     * @param {number} latitude - The latitude of the location.
     * @param {number} longitude - The longitude of the location.
     * @returns {Promise<void>}
     */
    async getLocationName(latitude, longitude) {
        const response = await fetch(`https://api.bigdatacloud.net/data/reverse-geocode-client?latitude=${latitude}&longitude=${longitude}&localityLanguage=en`);
        const data = await response.json();
        const locationName = data.city || data.locality || data.principalSubdivision || 'Your Location';
        document.getElementById('location').textContent = `📍 ${locationName}`;
    }

    /**
     * Gets the UV data for the given location and updates the UV display
     *
     * @param {number} latitude - The latitude of the location.
     * @param {number} longitude - The longitude of the location.
     *
     * @returns {Promise<void>} Resolves when the data is retrieved and the UI is updated
     */
    async getUVData(latitude, longitude) {
        try {
            const url = `https://api.open-meteo.com/v1/forecast?latitude=${latitude}&longitude=${longitude}&hourly=uv_index&daily=uv_index_max&timezone=auto`;
            const res = await fetch(url);
            const record = await res.json();

            const hourlyUV = record.hourly.uv_index;
            const hourlyTimes = record.hourly.time;
            const dailyMaxUV = record.daily.uv_index_max;

            // Get current UV index
            const now = new Date();
            const hours = now.getHours();
            const currentUV = Math.round(hourlyUV[hours] || 0);

            // Update UV display
            const currentUVEl = document.getElementById('currentUV');
            const uvLevelEl = document.getElementById('uvLevel');

            document.getElementById('currentUV').textContent = currentUV;
            document.getElementById('uvLevel').textContent = this.getUVLevel(currentUV);
            document.getElementById('uvLevel').className = `uv-level ${this.getUVLevelClass(currentUV)}`;

            // Update comparisons
            const todayMax = Math.round(dailyMaxUV[0] || 0);
            const yesterdayMax = Math.round(dailyMaxUV[1] || 0) || todayMax;

            document.getElementById('peakToday').textContent = todayMax;

            const comparison = todayMax - yesterdayMax;
            let comparisonText = '';
            if (comparison > 0) {
                comparisonText = `+${comparison} higher`;
            } else if (comparison < 0) {
                comparisonText = `${Math.abs(comparison)} lower`;
            } else {
                comparisonText = 'Same';
            }
            document.getElementById('vsYesterday').textContent = comparisonText;

            this.hourlyUVgraph(hourlyUV, hourlyTimes);
        } catch (error) {
            console.error('UV data error:', error);
        }
    }

    /**
     * Fetches and processes a 7-day weather forecast based on provided latitude and longitude.
     * Retrieves maximum and minimum temperatures for each day and updates the forecast UI.
     *
     * @param {number} latitude - The latitude of the location for the forecast.
     * @param {number} longitude - The longitude of the location for the forecast.
     *
     * @returns {Promise<void>} A promise that resolves when the forecast data is successfully processed.
     */
    async day7forecast(latitude, longitude) {
        try {
            const url = `https://api.open-meteo.com/v1/forecast?latitude=${latitude}&longitude=${longitude}&daily=temperature_2m_max,temperature_2m_min&timezone=auto&forecast_days=7`;
            const res = await fetch(url);
            const record = await res.json();

            const maxTemps = record.daily.temperature_2m_max;
            const minTemps = record.daily.temperature_2m_min;
            const dates = record.daily.time;

            this.updateForecast(dates, maxTemps, minTemps);
        } catch (error) {
            console.error('Forecast data error:', error);
        }
    }

    /**
     * Updates the forecast grid with the provided 7-day weather data.
     * Converts temperature from Celsius to Fahrenheit and applies appropriate styles
     * based on temperature ranges. Each forecast item displays the day of the week,
     * a weather emoji, and maximum/minimum temperatures.
     *
     * @param {string[]} dates - Array of date strings for the forecast period.
     * @param {number[]} maxTemps - Array of maximum temperatures in Celsius.
     * @param {number[]} minTemps - Array of minimum temperatures in Celsius.
     */
    updateForecast(dates, maxTemps, minTemps) {
        const forecastGrid = document.getElementById('forecastGrid');
        if (!forecastGrid) return;

        forecastGrid.innerHTML = '';

        for (let i = 0; i < Math.min(7, dates.length); i++) {
            const date = new Date(dates[i]);
            const maxTempF = Math.round(maxTemps[i] * (9/5) + 32);
            const minTempF = Math.round(minTemps[i] * (9/5) + 32);

            const forecastItem = document.createElement('div');
            forecastItem.className = 'forecast-item';

            // Add temperature-based styling
            if (maxTempF >= 90) forecastItem.classList.add('hot');
            else if (maxTempF >= 75) forecastItem.classList.add('warm');
            else forecastItem.classList.add('cool');

            forecastItem.innerHTML = `
                <div class="forecast-date">${date.toLocaleDateString([], {weekday: 'short'})}</div>
                <div class="forecast-emoji">${this.getWeatherEmoji(maxTempF)}</div>
                <div class="forecast-temp">${maxTempF}°<br>${minTempF}°</div>
            `;

            forecastGrid.appendChild(forecastItem);
        }
    }

    /**
     * Returns a weather emoji for a given temperature in Fahrenheit.
     *
     * @param {number} temp - The temperature in Fahrenheit.
     * @returns {string} A weather emoji representing the temperature.
     */
    getWeatherEmoji(temp) {
        if (temp >= 100) return '🔥';
        if (temp >= 90) return '🌡️';
        if (temp >= 80) return '☀️';
        if (temp >= 70) return '🌤️';
        if (temp >= 60) return '⛅';
        return '🌥️';
    }

    /**
     * Given a UV index, returns a string indicating the level of the UV index.
     *
     * @param {number} uv - The UV index.
     * @returns {string} The level of the UV index.
     */
    getUVLevel(uv) {
        if (uv <= 2) return 'Low';
        if (uv <= 5) return 'Moderate';
        if (uv <= 7) return 'High';
        if (uv <= 10) return 'Very High';
        return 'Extreme';
    }

    /**
     * Given a UV index, returns a string indicating the level of the UV index.
     * Used to determine the CSS class for the UV level display.
     *
     * @param {number} uv - The UV index.
     * @returns {string} The level of the UV index.
     */
    getUVLevelClass(uv) {
        if (uv <= 2) return 'low';
        if (uv <= 5) return 'moderate';
        if (uv <= 7) return 'high';
        if (uv <= 10) return 'very-high';
        return 'extreme';
    }

    /**
     * Plots a line chart of the hourly UV index for the current day.
     *
     * @param {number[]} hourlyUV - An array of the hourly UV indices.
     * @param {string[]} hourlyTimes - An array of the timestamps of the hourly UV indices.
     */
    hourlyUVgraph(hourlyUV, hourlyTimes) {
        const ctx = document.getElementById('uvChart');

        // Get current date's data
        const today = new Date().toISOString().split('T')[0];
        const todayUV = [];
        const todayLabels = [];

        for (let i = 0; i < hourlyTimes.length && i < 24; i++) {
            if (hourlyTimes[i].startsWith(today)) {
                const hour = new Date(hourlyTimes[i]).getHours();
                todayLabels.push(hour + ':00');
                todayUV.push(hourlyUV[i] || 0);
            }
        }

        if (this.uvChart) {
            this.uvChart.destroy();
        }

        this.uvChart = new Chart(ctx, {
            type: 'line',
            data: {
                labels: todayLabels,
                datasets: [{
                    label: 'UV Index',
                    data: todayUV,
                    borderColor: function(context) {
                        const chart = context.chart;
                        const {ctx, chartArea} = chart;
                        if (!chartArea) return;

                        const gradient = ctx.createLinearGradient(0, chartArea.bottom, 0, chartArea.top);
                        gradient.addColorStop(0, '#4CAF50');
                        gradient.addColorStop(0.2, '#FF9800');
                        gradient.addColorStop(0.5, '#F44336');
                        gradient.addColorStop(0.8, '#9C27B0');
                        gradient.addColorStop(1, '#673AB7');
                        return gradient;
                    },
                    backgroundColor: function(context) {
                        const chart = context.chart;
                        const {ctx, chartArea} = chart;
                        if (!chartArea) return;

                        const gradient = ctx.createLinearGradient(0, chartArea.bottom, 0, chartArea.top);
                        gradient.addColorStop(0, 'rgba(76, 175, 80, 0.1)');
                        gradient.addColorStop(0.2, 'rgba(255, 152, 0, 0.1)');
                        gradient.addColorStop(0.5, 'rgba(244, 67, 54, 0.1)');
                        gradient.addColorStop(0.8, 'rgba(156, 39, 176, 0.1)');
                        gradient.addColorStop(1, 'rgba(103, 58, 183, 0.1)');
                        return gradient;
                    },
                    borderWidth: 3,
                    fill: true,
                    tension: 0.4,
                    pointRadius: 0,
                    pointHoverRadius: 0,
                    pointBackgroundColor: 'transparent',
                    pointBorderWidth: 0
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        display: false
                    },
                    tooltip: {
                        backgroundColor: 'rgba(0, 0, 0, 0.8)',
                        titleColor: '#fff',
                        bodyColor: '#fff',
                        cornerRadius: 8,
                        displayColors: false,
                        callbacks: {
                            title: function(context) {
                                return `${context[0].label}`;
                            },
                            label: function(context) {
                                const uv = context.parsed.y;
                                const level = this.getUVLevel(uv);
                                return `UV Index: ${uv} (${level})`;
                            }.bind(this)
                        }
                    }
                },
                scales: {
                    x: {
                        display: true,
                        grid: {
                            display: false
                        },
                        ticks: {
                            maxTicksLimit: 6,
                            color: 'rgba(255, 255, 255, 0.8)',
                            font: {
                                size: 10
                            }
                        }
                    },
                    y: {
                        display: true,
                        min: 0,
                        max: 12,
                        grid: {
                            color: 'rgba(255, 255, 255, 0.2)',
                            drawBorder: false
                        },
                        ticks: {
                            stepSize: 2,
                            color: 'rgba(255, 255, 255, 0.8)',
                            font: {
                                size: 10
                            }
                        }
                    }
                },
                interaction: {
                    intersect: false,
                    mode: 'index'
                }
            }
        });
    }


}

    /**
     * Gets a random joke from the official Joke API and displays it in the #jokeText element.
     *
     * @async
     * @function getRandomJoke
     * @return {void}
     */
async function getRandomJoke() {
    const jokeText = document.getElementById("jokeText");
    if (!jokeText) return;

    jokeText.innerHTML = '<div style="color: rgba(255, 255, 255, 0.8);">Loading joke...</div>';

    try {
        const response = await fetch("https://official-joke-api.appspot.com/random_joke");
        const data = await response.json();
        jokeText.innerHTML = `
                <div style="font-weight: 600; margin-bottom: 8px; color: white;">
                    ${data.setup}
                </div>
                <div style="color: rgba(255, 255, 255, 0.9); font-weight: 500;">
                    ${data.punchline}
                </div>
            `;
    } catch (error) {
        jokeText.textContent = "Oops! Couldn't fetch a joke right now.";
        console.error("Joke API error:", error);
    }
}

// Initialize the weather widget
let weatherWidget;
window.addEventListener("load", () => {
    if (document.getElementById('loading')) {
        weatherWidget = new Weather();
    }
});