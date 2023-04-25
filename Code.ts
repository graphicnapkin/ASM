// https://script.google.com/macros/library/d/19bkwDLT1xtSGoXnHo_aoNft_A9h4h0IP5H0dwi2ScX45qxGk7uw3nPIZ/1
const userProperties = PropertiesService.getUserProperties()
const testProjectId = userProperties.getProperty('projectId')
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
 * @param {string} projectId - The Id of your GCP project
 * @param {string} secretName - The name of your secret in Secret Manager
 * @param {number} secretVersion - The version of your Secret
 * @param {function(string, ...any)} callbackFunction Callback function that will use secret.
 * @param {...any} callbackArguments Arguments to pass to callback function.
 **/
function useSecret<T>(
    projectId: string,
    secretName: string,
    secretVersion: number,
    callbackFunction: (secret: string, ...args: any[]) => T,
    ...callbackArguments: any[]
) {
    const secret = getUnsafeSecret(projectId, secretName, secretVersion)
    const response = callbackFunction(secret, ...callbackArguments)

    //This is a naive attempt to make this function more secure and encourage more secure patterns.
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
 * @param {string} projectId - The Id of your GCP project
 * @param {string} secretName - The name of your secret in Secret Manager
 * @param {number} secretVersion - The version of your Secret
 * @param {string} url - The URL to fetch data from.
 * @param {Object} [params] - Optional request options for the UrlFetchApp.fetch() method.
 * @param {boolean} testing - Used to test this function, returns auth header
 */
function fetchWithBasicAuth(
    projectId: string,
    secretName: string,
    secretVersion: number,
    url: string,
    params: GoogleAppsScript.URL_Fetch.URLFetchRequestOptions = {},
    testing?: boolean
) {
    const secret = getUnsafeSecret(projectId, secretName, secretVersion)
    params['Authorization'] = 'Basic ' + Utilities.base64Encode(secret)
    if (testing) {
        userProperties.setProperty('basicAuth', JSON.stringify(params))
    }

    return UrlFetchApp.fetch(url, params)
}

/**
 * Uses the UrlFetchApp.fetch method to perform a request with basic auth. The secret in Google Secret Manager should include 'Bearer' if it is needed in the api call.
 * @param {string} projectId - The Id of your GCP project
 * @param {string} secretName - The name of your secret in Secret Manager
 * @param {number} secretVersion - The version of your Secret
 * @param {string} url - The URL to fetch data from.
 * @param {Object} [params] - Optional request options for the UrlFetchApp.fetch() method.
 * @param {boolean} testing - Used to test this function, returns auth header
 */
function fetchWithBearerToken(
    projectId: string,
    secretName: string,
    secretVersion: number,
    url: string,
    params: GoogleAppsScript.URL_Fetch.URLFetchRequestOptions = {},
    testing?: boolean
) {
    const token = getUnsafeSecret(projectId, secretName, secretVersion)
    params['Authorization'] = token
    if (testing) {
        userProperties.setProperty('bearerAuth', JSON.stringify(params))
    }

    return UrlFetchApp.fetch(url, params)
}
// TODO: Get latest Secret Version by default using https://cloud.google.com/secret-manager/docs/reference/rest/v1beta1/projects.secrets.versions/list
/**
 * Returns secret value from GCP Secret Manager. This is UNSAFE and should be avoided where possible in favor of the useSecrets function.
 * The structure of secretPath is:
 * `projects/${projectId}/secrets/${secretName}/versions/${versionNumber}`
 * For more details see: https://github.com/graphicnapkin/ASM
 * @param {string} projectId - The Id of your GCP project
 * @param {string} secretName - The name of your secret in Secret Manager
 * @param {number} secretVersion - The version of your Secret
 * @return {string} Requested Secret
 **/
function getUnsafeSecret(
    projectId: string,
    secretName: string,
    secretVersion = 1
): string {
    if (!secretName || !projectId) {
        throw new Error(
            `A secretName and projectId are required for this function. provided:
            projectId: ${projectId} secretName: ${secretName}`
        )
    }
    const secretPath = `projects/${projectId}/secrets/${secretName}/versions/${
        secretVersion || 1
    }`

    /*  
        Get's an auth token for the effective user which is the account used
        to start the script that is leveraging this library.
    */
    const token = ScriptApp.getOAuthToken()
    const headers = { Authorization: 'Bearer ' + token }
    const url = `$https://secretmanager.googleapis.com/v1/${secretPath}:access`

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

// TODO: Add tests and implement with function that iterates through script properties and creates secrets
function makeSecret(
    projectId = '368381444370',
    secretId = 'testAppsScriptSecret',
    secretValue = 'testSecretValue'
) {
    const baseUrl = 'https://secretmanager.googleapis.com/v1/projects'
    const token = ScriptApp.getOAuthToken()
    const headers = {
        Authorization: 'Bearer ' + token,
        Accept: 'application/json',
    }

    let data = '{"replication": { "automatic": {}}}'
    let url = `${baseUrl}/${projectId}/secrets?secretId=${secretId}`
    const params: GoogleAppsScript.URL_Fetch.URLFetchRequestOptions = {
        headers,
        method: 'post',
        contentType: 'application-json',
        payload: data,
        //mute error since it will throw if secret already exists
        muteHttpExceptions: true,
    }
    UrlFetchApp.fetch(url, params)

    url = `${baseUrl}/${projectId}/secrets/${secretId}:addVersion`
    data = `{"payload":{"data":"${Utilities.base64EncodeWebSafe(
        secretValue
    )}"}}`
    UrlFetchApp.fetch(url, {
        ...params,
        payload: data,
        muteHttpExceptions: false,
    })
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
