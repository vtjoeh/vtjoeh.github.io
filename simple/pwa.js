const topPanel = document.getElementById("topPanel");
const bottomPanel = document.getElementById("bottomPanel");
const roomStatus = document.getElementById("roomStatus");
const workspaceName = document.getElementById("workspaceName");
const peopleCount = document.getElementById("peopleCount");
const roomTemp = document.getElementById("roomTemp");
const ambientNoise = document.getElementById("roomSound");

// let xapi;
let meetingRoomName = "Testing";
let userName = "";
let capacity = 10;
let roomNavigator = null;
let occupied = false;
let booked = false;
let peopleCountCurrent = 0;
let hotdesking = false;
let metricOnly = false;

const queryString = window.location.search;
const urlParams = new URLSearchParams(queryString);

console.log('loading'); 

if (urlParams.get("metricOnly")) {
  console.log('Displaying Metric Only')
  metricOnly = true;
}

window.onload = async function () {
  console.log("initizing");
  init();
};

async function init() {
  try { 
    xapi = await getXAPI();
    // xapi = await window.getXAPI();

    console.log("Connected to Webex Device");
    xapi.Config.UserInterface.LedControl.Mode.set("Auto")
      .then((result) => console.log("Led Control set to Auto", result))
      .catch((error) => console.log("Unable to set LedControl to Auto", error));
    console.log("testing line 44");
    getInitial();
    subscribe();
  } catch (e) {
    console.log("Unable to connect to Webex Device:", e);
  }
}

async function getInitial() {
  console.log("Getting Initial Values");
  pollStatus();
  setInterval(pollStatus, 1 * 1000 * 60);

  xapi.Status.RoomAnalytics.PeopleCount.Capacity.get().then((roomCapacity) => {
    console.log("RoomCount Capacity:", roomCapacity);
    if (roomCapacity == "-1") roomCapacity = 1;
    capacity = roomCapacity;
  });

  xapi.Status.RoomAnalytics.PeopleCount.Current.get().then((currentCount) => {
    console.log("RoomCount Current:", currentCount);
    if (currentCount == "-1") currentCount = 0;
    peopleCount.innerHTML = `${currentCount}/${capacity}`;
    peopleCountCurrent = currentCount;
  });

  xapi.Status.Bookings.Availability.Status.get().then((bookedStatus) => {
    console.log("Booked Status:", bookedStatus);
    booked = bookedStatus != "Free";
  });
  updateRoomStatus();
}

async function updateRoomStatus() {
  console.log("Updating Room Status");
  if (peopleCountCurrent > 0) {
    displayOccupied();
    return;
  }

  if (hotdesking) {
    displayReserved();
    return;
  }

  if (booked) {
    displayBooked();
    return;
  }

  displayAvailable();
}

// "/Command/UserInterface/LedControl/Color/Set",
// "/Configuration/SystemUnit/Name",
// "/Configuration/UserInterface/LedControl/Mode",
// "/Status/UserInterface/LedControl/Color",
// "/Status/SystemUnit/Hardware/Module/SerialNumber",
// "/Command/Bookings/Book",
// "/Command/Bookings/Clear",
// "/Command/Bookings/Delete",
// "/Command/Bookings/Edit",
// "/Command/Bookings/Extend",
// "/Command/Bookings/Get",
// "/Command/Bookings/List",
// "/Command/Bookings/NotificationSnooze",
// "/Command/Bookings/Put",
// "/Command/Bookings/Respond",
// "/Status/Bookings/Availability/Status",
// "/Status/Bookings/Availability/TimeStamp",
// "/Status/Bookings/Current/Id",
// "/Status/Peripherals/ConnectedDevice/RoomAnalytics/AirQuality/Index",
// "/Status/Peripherals/ConnectedDevice/RoomAnalytics/AmbientTemperature",
// "/Status/Peripherals/ConnectedDevice/RoomAnalytics/RelativeHumidity",
// "/Status/RoomAnalytics/AmbientTemperature",
// "/Status/RoomAnalytics/RelativeHumidity",
// "/Status/RoomAnalytics/PeopleCount/Capacity",
// "/Status/RoomAnalytics/PeopleCount/Current",
// "/Status/RoomAnalytics/PeoplePresence",
// "/Status/RoomAnalytics/AmbientNoise/Level/A",
// "/Status/RoomAnalytics/Sound/Level/A",
// "/Status/RoomAnalytics/ReverberationTime/Middle/RT60",
// "/Status/RoomAnalytics/ReverberationTime/LastRun",
// "/Status/RoomAnalytics/ReverberationTime/Octaves/CenterFrequency",
// "/Status/RoomAnalytics/ReverberationTime/Octaves/RT60",
// "/Status/RoomAnalytics/Engagement/CloseProximity",
// "/Status/SystemUnit/ProductId",

function subscribe() {
  console.log("Subscribing to status changes");

  xapi.Status.Bookings.Availability.Status.on((status) =>
    console.log("Booking Status Changed to:", status)
  );

  xapi.Status.Bookings.Availability.TimeStamp.on((status) =>
    console.log("Booking TimeStamp Changed to:", status)
  );

  xapi.Status.RoomAnalytics.PeopleCount.Capacity.on((roomCapacity) => {
    console.log("RoomCount Capacity changed to:", roomCapacity);
    if (roomCapacity == "-1") roomCapacity = 1;
    capacity = roomCapacity;
    updateRoomStatus();
  });

  xapi.Status.RoomAnalytics.PeopleCount.Current.on((currentCount) => {
    console.log("RoomCount Current changed to:", currentCount);
    if (currentCount == "-1") currentCount = 0;
    peopleCount.innerHTML = `${currentCount}/${capacity}`;
    peopleCountCurrent = currentCount;
    updateRoomStatus();
  });
}

function displayOccupied() {
  console.log("Setting status to Occupied");
  topPanel.style.backgroundColor = "red";
  bottomPanel.style.backgroundColor = "red";
  roomStatus.innerHTML = "Occupied";
  bottomPanel.style.color = "white";

  //Green, Yellow, Red, Off
  // xapi.Command.UserInterface.LedControl.Color.Set({ Color: "Red" });
}

function displayBooked() {
  console.log("Setting status to Booked");
  topPanel.style.backgroundColor = "orange";
  bottomPanel.style.backgroundColor = "orange";
  bottomPanel.style.color = "white";
  roomStatus.innerHTML = "Booked";
  // xapi.Command.UserInterface.LedControl.Color.Set({ Color: "Yellow" });
}

function displayReserved() {
  console.log("Setting status to Reserved by" + userName);
  topPanel.style.backgroundColor = "orange";
  bottomPanel.style.backgroundColor = "orange";
  bottomPanel.style.color = "white";
  roomStatus.innerHTML = `Reserved by ${userName}`;
  // xapi.Command.UserInterface.LedControl.Color.Set({ Color: "Yellow" });
}

function displayAvailable() {
  console.log("Setting status to Available");
  topPanel.style.backgroundColor = "green";
  bottomPanel.style.backgroundColor = "green";
  bottomPanel.style.color = "white";
  roomStatus.innerHTML = "Available";
  // xapi.Command.UserInterface.LedControl.Color.Set({ Color: "Green" });
}

function updateTemperature(ambientTemp) {
  console.log("Ambient Temp:", ambientTemp);

  if (metricOnly) {
    roomTemp.innerHTML = `${Math.round(ambientTemp)}°C`;
  } else {
    roomTemp.innerHTML = `${Math.round(
      (9 / 5) * ambientTemp + 32
    )}°F | ${Math.round(ambientTemp)}°C`;
  }
}

function pollStatus() {
  console.log("Polling Status");
  // xapi.Status.RoomAnalytics.AmbientTemperature.get()
  //   .then((ambientTemp) => updateTemperature(ambientTemp))
  //   .catch((error) => console.log("Unable to Ambient Temperature"));
  
  getTemperature();

  xapi.Status.RoomAnalytics.AmbientNoise.Level.A.get()
    .then((noise) => {
      console.log("Ambient Noise:", noise);
      ambientNoise.innerHTML = `${noise} dBA`;
    })
    .catch((error) => console.log("Unable to get Ambient Noise"));
}

function convertTemp(celc) {
  const far = (celc * 9.0) / 5.0 + 32.0;
  return Math.round(far) + "°F " + celc + "°C";
}

async function getTemperature() {
  const navID = await inRoomNavigator(xapi);
  console.log("NavID", navID);

  if (navID != -1) {
    console.log(
      `Getting Temperature and Humidity values from In-Room Navigator [${navID}]`
    );
    const ambientTemp =  
      await xapi.Status.Peripherals.ConnectedDevice[
        navID
      ].RoomAnalytics.AmbientTemperature.get();
    
    updateTemperature(ambientTemp)
   
  } else {
    console.log(
      `No In-Room Navigators found, attempting to get data from main device`
    );
    try {
      const ambientTemp =  await xapi.Status.RoomAnalytics.AmbientTemperature.get();
      updateTemperature(ambientTemp)
    } catch {
      console.log(`Temperature sensor not available on main device`);
    }
  }
}

function inRoomNavigator(xapi) {
  return xapi.Status.Peripherals.ConnectedDevice.get()
    .then((devices) => {
      const navigators = devices.filter((d) => {
        return (
          d.Name.endsWith("Navigator") &&
          d.Type == "TouchPanel" &&
          d.Location == "InsideRoom"
        );
      });

      if (navigators.length == 0) {
        return -1;
      } else {
        return navigators.pop().id;
      }
    })
    .catch((e) => {
      return -1;
    });
}


