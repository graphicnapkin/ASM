const scriptProperties = PropertiesService.getScriptProperties()
/**
 * useSecret provides a callback function a secret fetched from GCP Secrets Manager.
 * The desired secret is found by the secretPath argument.
 * The structure of secretPath is:
 * `projects/${projectId}/secrets/${secretName}/versions/${versionNumber}`
 * *
 * The first argument of the callback function should be the fetched secret, followed
 * by any additional arguments you pass in as normal.
 * `(secret: string, ...args: any[]) => any)`
 * Unfortunately the return type is lost here and you will need to type this manually using Jsdoc syntax `@type {}`
 *
 * For more details see: https://github.com/graphicnapkin/ASM#readme
 *
 *
 * @param {string} secretPath SecretPath is the path to the secret including version number.
 * @param {function(string, ...any)} callbackFunction Callback function that will use secret.
 * @param {...any} callbackArguments Arguments to pass to callback function.
 **/
function useSecret<T>(
    secretPath: string,
    callbackFunction: (secret: string, ...args: any[]) => T,
    ...callbackArguments: any[]
) {
    const secret = getUnsafeSecret(secretPath)
    const response = callbackFunction(secret, ...callbackArguments)

    /* 
        This is a naive attempt to make this function more secure and encourage more secure patterns.
    */
    if (JSON.stringify(response).includes(secret)) {
        throw new Error(
            "Unsafe usage of useSecret's function. Response included the secrets content which " +
                'should be avoided. If raw secret value is needed use the getSecret function.'
        )
    }

    return response
}

/**
 * Uses the UrlFetchApp.fetch method to perform a request with basic auth. The secret in Google Secret Manager must be stored in the form of `${username}:${password}`
 * @param {string} secretPath - The Path to the secret in Google Secrets Manager.
 * @param {string} url - The URL to fetch data from.
 * @param {Object} [params] - Optional request options for the UrlFetchApp.fetch() method.
 * @param {boolean} testing - Used to test this function, returns auth header
 */
function fetchWithBasicAuth(
    secretPath: string,
    url: string,
    params: GoogleAppsScript.URL_Fetch.URLFetchRequestOptions = {},
    testing?: boolean
) {
    const secret = getUnsafeSecret(secretPath)
    params['Authorization'] = 'Basic ' + Utilities.base64Encode(secret)
    if (testing) {
        scriptProperties.setProperty('basicAuth', JSON.stringify(params))
    }

    return UrlFetchApp.fetch(url, params)
}

/**
 * Uses the UrlFetchApp.fetch method to perform a request with basic auth. The secret in Google Secret Manager should include 'Bearer' if it is needed in the api call.
 * @param {string} secretPath - The Path to the secret in Google Secrets Manager.
 * @param {string} url - The URL to fetch data from.
 * @param {Object} [params] - Optional request options for the UrlFetchApp.fetch() method.
 * @param {boolean} testing - Used to test this function, returns auth header
 */
function fetchWithBearerToken(
    secretPath: string,
    url: string,
    params: GoogleAppsScript.URL_Fetch.URLFetchRequestOptions = {},
    testing?: boolean
) {
    const token = getUnsafeSecret(secretPath)
    params['Authorization'] = token
    if (testing) {
        scriptProperties.setProperty('bearerAuth', JSON.stringify(params))
    }

    return UrlFetchApp.fetch(url, params)
}

/**
 * Returns secret value from GCP Secret Manager. This is UNSAFE and should be avoided where possible in favor of the useSecrets function.
 * The structure of secretPath is:
 * `projects/${projectId}/secrets/${secretName}/versions/${versionNumber}`
 * For more details see: https://github.com/graphicnapkin/ASM
 * @param {string} secretPath
 * @return {string} Requested Secret
 **/
function getUnsafeSecret(secretPath: string): string {
    if (!secretPath) {
        throw new Error('A secretPath is required for this function.')
    }

    const baseUrl = 'https://secretmanager.googleapis.com/v1/'

    /*  
        Get's an auth token for the effective user which is the account used
        to start the script that is leveraging this library.
    */
    const token = ScriptApp.getOAuthToken()

    const headers = { Authorization: 'Bearer ' + token }
    const url = `${baseUrl}${secretPath}:access`

    let data: { payload?: { data?: string } }
    try {
        const response = UrlFetchApp.fetch(url, { headers })
        data = JSON.parse(response.getContentText())
    } catch (err) {
        const errorString = err.toString()
        let message = errorString

        if (errorString.includes('code 403')) {
            message = `${Session.getEffectiveUser()} does not have access to ${secretPath} or secret does not exist.`
        }

        if (errorString.includes('code 404')) {
            message = `Secret not found. secretPath provided: ${secretPath}`
        }

        throw new Error(message)
    }

    const encodedSecret = data?.payload?.data
    if (!encodedSecret) {
        throw new Error(
            `Invalid secrets contents. Response from secrets manager: 
            ${JSON.stringify(data)}`
        )
    }

    const secretBytes = Utilities.base64Decode(encodedSecret)
    return _byteToString(secretBytes)
}

function _byteToString(bytes: number[]): string {
    let result = ''
    for (let i = 0; i < bytes.length; ++i) {
        const byte = bytes[i]
        const text = byte.toString(16)
        result += (byte < 16 ? '%0' : '%') + text
    }

    return decodeURIComponent(result)
}

/**

Boiler plate to implement JWT function

function getJWT() {
  // Replace the contents of privateKeyJson with your service account key file contents
  var privateKeyJson = {
    "type": "service_account",
    "project_id": "YOUR_PROJECT_ID",
    "private_key_id": "YOUR_PRIVATE_KEY_ID",
    "private_key": "-----BEGIN PRIVATE KEY-----\nYOUR_PRIVATE_KEY\n-----END PRIVATE KEY-----\n",
    "client_email": "YOUR_SERVICE_ACCOUNT_EMAIL",
    "client_id": "YOUR_CLIENT_ID",
    "auth_uri": "https://accounts.google.com/o/oauth2/auth",
    "token_uri": "https://oauth2.googleapis.com/token",
    "auth_provider_x509_cert_url": "https://www.googleapis.com/oauth2/v1/certs",
    "client_x509_cert_url": "YOUR_CERT_URL"
  };

  var header = {
    "alg": "RS256",
    "typ": "JWT"
  };

  var now = Math.floor(Date.now() / 1000);
  var claimSet = {
    "iss": privateKeyJson.client_email,
    "scope": "https://www.googleapis.com/auth/calendar",
    "aud": "https://oauth2.googleapis.com/token",
    "exp": now + 3600,
    "iat": now
  };

  var headerBase64Url = Utilities.base64EncodeUrlSafe(JSON.stringify(header));
  var claimSetBase64Url = Utilities.base64EncodeUrlSafe(JSON.stringify(claimSet));
  var signatureInput = headerBase64Url + '.' + claimSetBase64Url;
  var signatureBytes = Utilities.computeRsaSha256Signature(signatureInput, privateKeyJson.private_key);
  var signatureBase64Url = Utilities.base64EncodeUrlSafe(signatureBytes);

  var jwt = signatureInput + '.' + signatureBase64Url;
  return jwt;
}

function getAccessToken() {
  var jwt = getJWT();
  var payload = {
    "grant_type": "urn:ietf:params:oauth:grant-type:jwt-bearer",
    "assertion": jwt
  };
  
  var options = {
    "method": "post",
    "payload": payload
  };

  var response = UrlFetchApp.fetch("https://oauth2.googleapis.com/token", options);
  var jsonResponse = JSON.parse(response.getContentText());
  return jsonResponse.access_token;
}

function makeApiCall() {
  var accessToken = getAccessToken();
  var calendarId = 'primary';
  var url = 'https://www.googleapis.com/calendar/v3/calendars/' + calendarId + '/events';
  
  var options = {
    "method": "get",
    "headers": {
      "Authorization": "Bearer " + accessToken
    }
  };

  var response = UrlFetchApp.fetch(url, options);
  var jsonResponse = JSON.parse(response.getContentText());
  Logger.log(jsonResponse);
}

 */
