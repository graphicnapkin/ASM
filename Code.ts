/**
 * useSecret provides a callback function a secret fetched from GCP Secrets Manager.
 * The desired secret is found by the secretPath argument.
 * The structure of secretPath is:
 * `projects/${projectId}/secrets/${secretName}/versions/${versionNumber}`
 * *
 * The first argument of the callback function should be the fetched secret, followed
 * by any additional arguments you pass in as normal.
 * `(secret: string, ...args: any[]) => any)`
 *
 * For more details see:
 * https://github.com/graphicnapkin/Google-Workspace-AppsScript-Utilities/blob/main/GASM/README.md
 *
 * @param {string} secretPath SecretPath is the path to the secret including version number.
 * @param {function(string, ...any): any} callbackFunction Callback function that will use secret.
 * @param {...any} callbackArguments Arguments to pass to callback function.
 * @return {any}
 **/
function useSecret(
    secretPath: string,
    callbackFunction: (secret: string, ...args: any[]) => any,
    ...callbackArguments: any[]
): any {
    const secret = getSecret(secretPath)
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
 * Returns secret value from GCP Secret Manager. This is UNSAFE and should be avoided where possible in favor of the useSecrets function.
 * The structure of secretPath is:
 * `projects/${projectId}/secrets/${secretName}/versions/${versionNumber}`
 * For more details see:
 * https://github.com/graphicnapkin/Google-Workspace-AppsScript-Utilities/blob/main/GASM/README.md
 * @param {string} secretPath
 * @return {string} Requested Secret
 **/
function getSecret(secretPath: string): string {
    if (!secretPath) {
        throw new Error('A secretPath is required for this function.')
    }

    const baseUrl = 'https://secretmanager.googleapis.com/v1/'

    /*  
        Get's an auth token for the effective user which is the account used
        to start the script that is leveraging this library.
    */
    let token: string
    try {
        token = ScriptApp.getOAuthToken()
    } catch (err) {
        throw new Error('Error generating OAuth Token: ' + err.toString())
    }

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

// Utility function
function _byteToString(bytes: number[]): string {
    let result = ''
    for (let i = 0; i < bytes.length; ++i) {
        const byte = bytes[i]
        const text = byte.toString(16)
        result += (byte < 16 ? '%0' : '%') + text
    }

    return decodeURIComponent(result)
}
