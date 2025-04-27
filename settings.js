document.addEventListener("DOMContentLoaded", async () => {
	updateSearches();
});
// event listener for save button
document.getElementById("save-search").addEventListener("click", () => {
	saveSearch();
	updateSearches();
});

// save search logic
async function saveSearch() {
	const searches = (await chrome.storage.local.get("searches")).searches || [];
	console.log("getting searches from local storage...\n", searches);
	const urlInput = document.getElementById("search-url").value.trim();
	const nameInput = document.getElementById("search-name").value.trim();

	if (!urlInput || !nameInput) {
		showToast("please enter both a name and a url before saving.");
		return;
	}

	if (!isValidUrl(urlInput) || !urlInput.includes("picknpull.com")) {
		showToast("please enter a valid pick-n-pull url ⚠");
		return;
	}

	if (searches.some((s) => s.name === nameInput)) {
		showToast("this name already exists ⚠");
		return;
	}

	if (searches.some((s) => s.url === urlInput)) {
		showToast("this url already exists ⚠");
		return;
	}
	const params = Object.fromEntries(new URL(urlInput).searchParams.entries());
	console.log("params:\n", params);
	searches.push({ name: nameInput, url: urlInput, params: params });
	await chrome.storage.local.set({ searches });
	showToast("search saved successfully 💾");
	updateSearches();
}

// update ui with saved searches
async function updateSearches() {
	const searches = (await chrome.storage.local.get("searches")).searches || [];
	const savedSearches = document.getElementById("saved-searches");
	savedSearches.innerHTML = ""; // clear existing searches

	searches.forEach((search) => {
		const searchItem = document.createElement("div");
		const params = Object.entries(search.params)
			.map(([key, value]) => `${key}: ${value}`)
			.join(" ");
		searchItem.className = "search-item";
		searchItem.innerHTML = `
                        <h3>${search.name}</h3>
                        <h3>${params}</h3>
                        <h3>${search.url}</h3>
                        <button class="launch-search">launch 🚀</button>
                        <button class="delete-search">delete 🚮</button>
                `;

		// add event listener to delete button
		searchItem.querySelector(".delete-search").addEventListener("click", () => {
			deleteSearch(search.name);
		});
		// add event listener to launch button
		searchItem.querySelector(".launch-search").addEventListener("click", () => {
			launchSearch(search.url);
		});

		savedSearches.appendChild(searchItem);
	});
}

// delete a search
async function deleteSearch(name) {
	let searches = (await chrome.storage.local.get("searches")).searches || [];
	searches = searches.filter((item) => item.name !== name);
	await chrome.storage.local.set({ searches });
	updateSearches();
	showToast("search deleted successfully 🚮");
}

// launch search
function launchSearch(url) {
	chrome.tabs.create({ url });
	showToast("launching search.. 🚀");
}

// function to check for updates
async function checkForUpdates() {
	const response = await chrome.runtime.sendMessage(
		{ action: "checkForInventoryUpdates" },
		(response) => {
			if (response && response.success) {
				console.log("inventory check completed.");
				updateSearches();
			} else {
				console.error("Error checking for inventory updates:", response);
			}
		}
	);
	return response;
}
const checkUpdatesButton = document.getElementById("check-for-updates");
checkUpdatesButton.addEventListener("click", () => {
	checkForUpdates();
	showToast("checking for updates... 🔄");
});

// validate url
function isValidUrl(url) {
	const urlRegex = new RegExp(
		"^(https?:\\/\\/)?" + // protocol (optional)
			"((([a-zA-Z0-9\\-]+\\.)+[a-zA-Z]{2,})|" + // domain name
			"localhost|" + // localhost
			"\\d{1,3}\\.\\d{1,3}\\.\\d{1,3}\\.\\d{1,3}|" + // ip address
			"\\[?[a-fA-F0-9]*:[a-fA-F0-9:]+\\]?)" + // ipv6
			"(\\:\\d+)?(\\/[-a-zA-Z0-9@:%_+.~#?&//=]*)?$"
	);
	return urlRegex.test(url);
}

// show toast notification
function showToast(message) {
	const toast = document.createElement("div");
	toast.textContent = message;
	Object.assign(toast.style, {
		position: "fixed",
		bottom: "20px",
		right: "20px",
		backgroundColor: "#333",
		color: "#fff",
		padding: "10px 20px",
		borderRadius: "5px",
		boxShadow: "0 2px 5px rgba(0, 0, 0, 0.3)",
		zIndex: "1000",
	});
	document.body.appendChild(toast);
	setTimeout(() => toast.remove(), 3000);
}
