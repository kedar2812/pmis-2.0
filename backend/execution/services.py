"""
Weather Service for Site Execution module.
Fetches daily weather data from the free Open-Meteo API (no API key required).

API Docs: https://open-meteo.com/en/docs
"""
import requests
import logging
from datetime import date

logger = logging.getLogger(__name__)

OPEN_METEO_URL = "https://api.open-meteo.com/v1/forecast"


class WeatherService:
    """
    Fetches weather data for a specific location and applies it to a DailySiteLog instance.

    Usage:
        WeatherService.fetch_and_apply(log_instance)
        # Then the caller saves the instance.
    """

    @classmethod
    def fetch_and_apply(cls, log_instance):
        """
        Fetches today's weather for the log's lat/lon and sets the weather fields
        on the log_instance WITHOUT saving. Caller is responsible for saving.

        Gracefully no-ops if lat/lon are missing or the API call fails.

        Args:
            log_instance: DailySiteLog instance (unsaved or pre-save)
        """
        if log_instance.latitude is None or log_instance.longitude is None:
            logger.info(
                "WeatherService: No coordinates on log, skipping weather fetch."
            )
            return

        try:
            params = {
                "latitude": float(log_instance.latitude),
                "longitude": float(log_instance.longitude),
                "daily": "temperature_2m_max,temperature_2m_min,precipitation_sum",
                "timezone": "auto",
                "forecast_days": 1,  # Only need today
            }

            response = requests.get(
                OPEN_METEO_URL,
                params=params,
                timeout=10  # Don't block the request for more than 10s
            )
            response.raise_for_status()
            data = response.json()

            daily = data.get("daily", {})
            temp_max_list = daily.get("temperature_2m_max", [])
            temp_min_list = daily.get("temperature_2m_min", [])
            rain_list = daily.get("precipitation_sum", [])

            # Index 0 = today's forecast (we only request 1 day)
            if temp_max_list:
                log_instance.weather_temp_max = temp_max_list[0]
            if temp_min_list:
                log_instance.weather_temp_min = temp_min_list[0]
            if rain_list:
                log_instance.weather_rain_mm = rain_list[0]

            logger.info(
                f"WeatherService: Fetched weather for ({log_instance.latitude}, "
                f"{log_instance.longitude}): "
                f"max={log_instance.weather_temp_max}°C, "
                f"min={log_instance.weather_temp_min}°C, "
                f"rain={log_instance.weather_rain_mm}mm"
            )

        except requests.Timeout:
            logger.warning(
                "WeatherService: API request timed out. Log will be saved without weather data."
            )
        except requests.RequestException as e:
            logger.warning(
                f"WeatherService: API request failed ({e}). Log will be saved without weather data."
            )
        except (KeyError, ValueError, TypeError) as e:
            logger.warning(
                f"WeatherService: Failed to parse API response ({e}). "
                "Log will be saved without weather data."
            )
