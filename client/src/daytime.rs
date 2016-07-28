use super::event_manager::*;
use glium::glutin::{ElementState, Event, VirtualKeyCode};
use std::f32::consts;
use base::math::*;

#[derive(Debug)]
pub struct DayTime {
    time_year: u32,
    time_day: u32,
    time_on_day: f32,
    speed: f32,
}

// `DEFAULT_TIME_SPEED` is 1.0 so the time goes at normal speed
// `PLUS_TIME_SPEED` is the factor with which the time is sped up, when the
// speed-up key is pressed
const DEFAULT_TIME_SPEED: f32 = 1.0;
const PLUS_TIME_SPEED: f32 = 1000.0;


impl Default for DayTime {
    fn default() -> DayTime {
        DayTime {
            time_year: 0,
            time_day: 0,
            time_on_day: 0.0,
            speed: 1.0,
        }
    }
}

const DAY_LENGTH: f32 = 720.0;
const YEAR_LENGTH: u32 = 12;

const MONTH_DIFFERENCE: f32 = 3.1415 / 18.0;


impl DayTime {
    pub fn set_time(&mut self, time_year: u32, time_day: u32, time_on_day: f32) {
        self.time_year = time_year;
        self.time_day = time_day;
        self.time_on_day = time_on_day;
        self.speed = DEFAULT_TIME_SPEED;
    }

    pub fn get_time_year(&self) -> u32 {
        self.time_year
    }

    pub fn get_time_day(&self) -> u32 {
        self.time_day
    }

    pub fn get_time_on_day(&self) -> f32 {
        self.time_on_day
    }

    /// Updates time with the use of `delta` as additionally passed time
    /// `DAY_LENGTH` defines the length of a day in real-life seconds
    /// `YEAR_LENGTH` defines the length of a year in `DAY_LENGTH`s
    pub fn update(&mut self, delta: f32) {
        // Output of Time
        info!("Year: {} Day: {} Time: {}",
              self.time_year,
              self.time_day,
              self.time_on_day);

        // Checks if one day has passed
        self.time_on_day += delta * self.speed;
        if (self.time_on_day) >= DAY_LENGTH {
            self.time_on_day -= DAY_LENGTH; // Removes one day from time_on_day
            self.time_day += 1;
            if (self.time_day) >= YEAR_LENGTH {
                self.time_day = 0;
                self.time_year += 1;
            }
        }

    }


    /// returns the position of the sun corresponding to time
    pub fn get_sun_position(&self) -> Vector3f {
        // 0 degrees for mid summer
        // 60 degrees for hard winter
        let half_year = YEAR_LENGTH as f32 / 2.0;
        let half_day = DAY_LENGTH as f32 / 2.0;


        let mut theta = self.time_day as f32 - half_year;
        if theta < 0.0 {
            theta *= -1.0;
        }
        // theta now is the day difference from the highest day, sunposition-wise
        theta *= MONTH_DIFFERENCE;

        if self.time_on_day < half_day {
            // pre noon
            // sun rising
            theta += consts::PI - consts::PI * (self.time_on_day / half_day)
        } else {
            // after noon
            // sun going down
            theta += consts::PI * ((self.time_on_day - half_day) / half_day)
        }

        let phi = self.time_on_day / DAY_LENGTH as f32 * 2.0 * consts::PI;

        // for debugging
        // info!("THETA: {} PHI: {}", theta, phi);

        // returns sun position in cartesian coordinates
        Vector3f::new(theta.sin() * phi.cos(),
                      theta.sin() * phi.sin(),
                      theta.cos())


    }

    /// returns the Vector3f for the directional sunlight
    pub fn get_sun_light_vector(&self) -> Vector3f {
        Vector3f::new(0.0, 0.0, 0.0) - self.get_sun_position()
    }
}

/// Handler to speed up time with use of '+' key
impl EventHandler for DayTime {
    fn handle_event(&mut self, e: &Event) -> EventResponse {
        match *e {
            Event::KeyboardInput(ElementState::Pressed, _, Some(VirtualKeyCode::Add)) => {
                self.speed = PLUS_TIME_SPEED;
                EventResponse::Continue
            }
            Event::KeyboardInput(ElementState::Released, _, Some(VirtualKeyCode::Add)) => {
                self.speed = DEFAULT_TIME_SPEED;
                EventResponse::Continue
            }
            _ => EventResponse::NotHandled,
        }

    }
}
