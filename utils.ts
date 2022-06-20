import axios from "axios";
import { utils } from "ethers";

function notUndefined(para) {
  if (typeof para === "undefined") {
    return false;
  }
  return true;
}

const sleepMs = (ms) => new Promise((res) => setTimeout(res, ms));
const axiosConfig = {
  headers: {
    "Content-Type": "application/json",
  },
};

async function getUrlRequest(queryURL, defaultResponse) {
  let response;

  try {
    response = await axios.get(queryURL);
    if (response.statusCode < 200 || response.statusCode > 299) {
      return defaultResponse;
    }
  } catch (err) {
    console.log("axios.get() EXCEPTION:");
    return defaultResponse;
  }

  if (notUndefined(response.data)) {
    return response.data;
  } else {
    console.log("getPassword() ERROR: " + JSON.stringify(response.data));
    return defaultResponse;
  }
}

async function postUrlRequest(queryURL, payload, defaultResponse) {
  let response;

  try {
    response = await axios.post(queryURL, payload, axiosConfig);
    if (response.statusCode < 200 || response.statusCode > 299) {
      return defaultResponse;
    }
  } catch (err) {
    console.log("axios.post() EXCEPTION:");
    return defaultResponse;
  }

  if (notUndefined(response.data)) {
    return response.data;
  } else {
    console.log("getPassword() ERROR: " + JSON.stringify(response.data));
    return defaultResponse;
  }
}

// Do NOT access it frequently, otherwise request might be blocked
async function getGasPrice(debug) {
  const defaultGasPrice = {
    code: 200,
    data: {
      rapid: utils.parseUnits("122", "gwei"),
      fast: utils.parseUnits("116", "gwei"),
      standard: utils.parseUnits("100", "gwei"),
      slow: utils.parseUnits("93", "gwei"),
      timestamp: new Date("2021-04-15T00:59:04.593Z").getTime(),
    },
  };
  // Alternative: https://docs.ethgasstation.info/gas-price
  // https://ethgasstation.info/api/ethgasAPI.json?api-key=XXAPI_Key_HereXXX
  // ***Note: To convert the provided values to gwei, divide by 10.***

  // https://taichi.network/#gasnow
  const queryURL = "https://www.gasnow.org/api/v3/gas/price?utm_source=:AutomaticTraders";
  const resonse = await getUrlRequest(queryURL, defaultGasPrice);
  const priceList = resonse.data;
  // console.log(priceList);
  if (debug) {
    console.log("gas price", {
      rapid: utils.formatUnits(priceList.rapid, "gwei"),
      fast: utils.formatUnits(priceList.fast, "gwei"),
      standard: utils.formatUnits(priceList.standard, "gwei"),
      slow: utils.formatUnits(priceList.slow, "gwei"),
    });
  }
  return priceList;
}

export { notUndefined, sleepMs, getUrlRequest, postUrlRequest, getGasPrice };
