chrome.runtime.onInstalled.addListener(() => {
	// set default values for storage
	chrome.storage.local.set({ isEnabled: true }, () => {
		console.log("Extension installed and enabled by default.");
	});
});

chrome.action.onClicked.addListener(() => {
	chrome.runtime.openOptionsPage();
});

// on startup, check for inventory updates
chrome.runtime.onStartup.addListener(() => {
	checkForInventoryUpdates();
});

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
	if (request.action === "checkForInventoryUpdates") {
		console.log("checking for inventory updates...");
		try {
			checkForInventoryUpdates();
			console.log("inventory check completed.");
			sendResponse({ success: true });
		} catch (error) {
			console.error("Error checking for inventory updates:", error);
			sendResponse({ success: false, error: error.message });
		}
	}
});

// configure the time interval for checking inventory updates
let CHECK_INTERVAL = 10; // 10 minutes
// alarm setup to poll every 10 minutes
chrome.alarms.create("inventoryCheck", {
	periodInMinutes: CHECK_INTERVAL,
});
// alarm listener
chrome.alarms.onAlarm.addListener((alarm) => {
	if (alarm.name === "inventoryCheck") {
		// Fetch the inventory from the target URL
		checkForInventoryUpdates();
		console.log("checking for inventory updates...");
	}
});

// check for inventory updates
async function checkForInventoryUpdates() {
	// get searches from chrome storage
	let searches = (await chrome.storage.local.get("searches")) || [];
	console.log("getting searches from local storage...\n", searches);
	// for every search in searches, fetch inventory from their url
	searches = searches.searches || []; // ensure searches is an array
	console.log("searches:\n", searches);
	const apiUrl = new URL("https://www.picknpull.com/api/vehicle/search");
	// required params: makeId, modelId, distance, zip - max distance 25000 mi = unlimited
	// optional params: year, language
	searches.forEach(async (search) => {
		// build the api call from the url
		function buildAPICall(params) {
			const sp = new URLSearchParams();
			// Required parameters
			if (params.make) sp.append("makeId", params.make);
			if (params.model) sp.append("modelId", params.model);

			// Optional parameters
			if (params.year !== undefined) sp.append("year", params.year || "");
			sp.append("language", "english"); // default to english
			if (params.distance) sp.append("distance", params.distance);
			if (params.zip) sp.append("zip", params.zip);
			return `${apiUrl}?&${sp.toString()}`;
		}
		const apiCall = buildAPICall(search.params);
		// call the api and get the data
		try {
			const response = await fetch(apiCall, {
				credentials: "include",
				headers: {
					Origin: "https://www.picknpull.com",
				},
			});
			const data = await response.json();
			console.log("data:\n", data);
			// extract the vehicle inventory from the data only.
			const inventory = data.flatMap((location) => {
				return location.vehicles.map((vehicle) => {
					return {
						id: vehicle.id,
						make: vehicle.make,
						model: vehicle.model,
						year: vehicle.year,
						vin: vehicle.vin,
						row: vehicle.row,
						location: vehicle.locationName,
						dateAdded: vehicle.dateAdded,
						image: vehicle.largeImage,
					};
				});
			});
			console.log("inventory:\n", inventory);
			// check if the inventory is empty
			if (inventory.length === 0) {
				console.log("no inventory found for this search.");
				return;
			}
			// set the data in chrome storage
			// initialize the inventory array if it doesn't exist
			if (!search.inventory) {
				search.inventory = [];
			}
			search.inventory = inventory;
			// sort the inventory by date added
			search.inventory = [...search.inventory].sort(
				(a, b) => new Date(b.dateAdded) - new Date(a.dateAdded)
			);
			if (search.inventory.lengh < inventory.length) {
				console.log("new inventory found for this search.");
			}

			chrome.storage.local.set({ searches }, () => {
				console.log("inventory updated in local storage.");
			});
		} catch (error) {
			console.error(`Failed to fetch ${search.url}:`, error);
		}
	});
}

// notification function
function notifyUser(title, message) {
	chrome.notifications.create({
		type: "basic",
		iconUrl: "icon.png",
		title: title,
		message: message,
	});
}
