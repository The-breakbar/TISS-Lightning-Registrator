// This file handles getting the correct time from an API and checking if the local time is correct
const TIME_DEVIATION_MAX = 30000; // 30 seconds
const MAX_API_WAIT_TIME = 10000; // 10 seconds
const controller = new AbortController();

// Check if the user's local time differs more than 30 seconds from the exact time
// This is necessary, because if the difference is too big, the registration will start too early/late
// This is not a perfect solution, if the request fails, then the time is not checked
// However this should only happen very rarely, as most system clocks don't deviate that much
let getSyncedTime = async () => {
	let timeOverride = Date.now(); // Default to local time

	setTimeout(() => controller.abort(), MAX_API_WAIT_TIME); // abort the request if it takes too long/is rate limited
	const timeResponse = await fetch("https://timeapi.io/api/time/current/zone?timeZone=Europe%2FVienna", { signal: controller.signal }).catch((error) => {
		if (error.name === "AbortError") console.log("Time API request aborted for taking too long");
		else console.error("Time API request failed", error);
	});

	if (timeResponse?.ok) {
		// If response is fine, extract the timestamp
		const data = await timeResponse.json();
		let serverTime = new Date(data.dateTime).getTime(); // Convert to timestamp
		let timeDifference = Math.abs(Date.now() - serverTime);
		console.log(`Local time: ${new Date(Date.now()).toLocaleString()}\nServer time: ${new Date(serverTime).toLocaleString()}\nDifference: ${timeDifference}ms`);

		if (timeDifference > TIME_DEVIATION_MAX) {
			timeOverride = serverTime;
		}
	}

	return timeOverride;
};
