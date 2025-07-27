
class Weather {
    constructor() {
        this.init();
    }

    init() {
        this.events();
        this.updateDateTime();
        this.loadWeather().then(r => console.log());

        //Update the time every second
        setInterval(() => this.updateDateTime(), 1000);
    }

    events() {
        const refreshButton = document.getElementById('refresh-btn');
        if (refreshButton) {
            refreshButton.addEventListener('click', () => this.loadWeather());
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
        document.getElementById('time').innerHTML = `Current time: ${time}`;
        document.getElementById('date').textContent = date;
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
            console.error('Failed to the load weather', error);
            this.showError();
        }
    }


    async getLocation() {
        return new Promise((resolve, reject) => {
            // This gets the users current location
            function success(position) {
                const latitude = position.coords.latitude;
                const longitude = position.coords.longitude;

                // let data;
                console.log(longitude)
                console.log(latitude)

                // Used for testing to check to see if location was being pulled
                // data = `<li> Lad: ${latitude} and Long: ${longitude} </li>`

                this.getWeather(longitude, latitude);
                resolve();
            }

            function error(err) {
                reject(err)
            }

            if (navigator.geolocation) {
                navigator.geolocation.getCurrentPosition(
                    success.bind(this),
                    error,
                    {timeout: 10000, enableHighAccuracy: true}
                );
            } else {
                reject(new Error('Geolocation is not supported'));
            }
        });
    }

    async getWeather(longitude, latitude) {
        const url = `https://api.open-meteo.com/v1/forecast?latitude=${latitude}&longitude=${longitude}&hourly=temperature_2m,relative_humidity_2m,apparent_temperature&current_weather=true&timezone=auto`;

        // Pulling from the weather API
        const res = await fetch(url)
        const record = await res.json()

        const temps = record.hourly.temperature_2m;
        const humidity = record.hourly.relative_humidity_2m;
        const feelsLike = record.hourly.apparent_temperature;
        const times = record.hourly.time;

        //The current time
        const now = new Date();
        const hours = now.getHours();
        // const timeString = now.toLocaleTimeString();


        console.log(`Current time ${hours}`)
        let intHours = parseInt(hours);

        //Test Code for API call
        console.log(temps[intHours] * (9 / 5) + 32)
        console.log(times[intHours])


        // Convert Celsius to Fahrenheit
        const currentTempF = Math.round(temps[intHours] * (9 / 5) + 32);
        const feelsLikeF = Math.round(feelsLike[intHours] * (9 / 5) + 32);
        const currentHumidity = Math.round(humidity[intHours]);

        console.log(`Current temp: ${currentTempF}°F`);
        console.log(`Current time: ${times[intHours]}`);

        // Update the display
        document.getElementById('temp').innerHTML = `${currentTempF}°F`;
        document.getElementById('feels-like').textContent = `${feelsLikeF}°F`;
        document.getElementById('humidity').textContent = `${currentHumidity}%`;

        // Changes the color of the page based on the current temp at user location
        // Also display a message
        // const currentTemp = temps[intHours] * (9 / 5) + 32;
        const currentTemp = currentTempF

        if (currentTemp >= 90) {
            this.changeBackground("hot");
            document.getElementById("currenttemps").innerHTML = "Its way too hot";
        } else if (currentTemp >= 80) {
            this.changeBackground("warm");
            document.getElementById("currenttemps").innerHTML = "Its not too hot";
        } else {
            this.changeBackground("cold");
            document.getElementById("currenttemps").innerHTML = "Its getting chilly";
        }
        await this.getLocationName(latitude, longitude)
        this.showWeather()
    }

    async getLocationName(latitude, longitude) {
        const response = await fetch(`https://api.bigdatacloud.net/data/reverse-geocode-client?latitude=${latitude}&longitude=${longitude}&localityLanguage=en`);
        const data = await response.json();
        const locationName = data.city || data.locality || data.principalSubdivision || 'Your Location';
        document.getElementById('location').textContent = `📍 ${locationName}`;
    }

    // Make function that changes the color of the background based on how hot it is
    changeBackground(temp) {
        document.body.className = '';
        document.body.classList.add(temp);
    }
}

// Initialize the weather widget
let weatherWidget;
// Starts the extension
window.addEventListener("load", () => {
    weatherWidget = new Weather();
});
