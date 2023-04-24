//declare var scriptProperties: GoogleAppsScript.Properties.Properties

function runTests() {
    testGetUnsafeSecret()
    testUseSecret()
    testFetchWithBasicAuth()
    testFetchWithBearerToken()
}

function testGetUnsafeSecret() {
    const secretPath = getSecretPath('TestGetUnsafeSecret', 1)
    // secret contents: 'UNSAFE_SECRET'
    const secret = getUnsafeSecret(secretPath)

    if (secret != 'UNSAFE_SECRET') {
        console.error(
            "getUnsafeSecret Failed. Expected 'UNSAFE_SECRET' got: " + secret
        )
        return
    }

    try {
        getUnsafeSecret('/')
    } catch (err) {
        if (
            err.toString() != 'Error: Secret not found. secretPath provided: /'
        ) {
            console.error(
                "getUnsafeSecret Failed. Expected error 'Secret not found.' got: " +
                    err
            )
            return
        }
    }

    try {
        getUnsafeSecret('')
    } catch (err) {
        if (
            err.toString() !=
            'Error: A secretPath is required for this function.'
        ) {
            console.error(
                "getUnsafeSecret Failed. Expected error 'Secret not found.' got: " +
                    err
            )
            return
        }
    }

    console.log('getUnsafeSecret Passed.')
}

function testUseSecret() {
    // secret contents: 'https://jsonplaceholder.typicode.com/posts?userId='
    const secretPath = getSecretPath('TestUseUnsafeSecret', 1)

    /**
     * @param secretUrl
     * @param number
     * @returns {UrlFetchApp.HTTPResponse}
     */
    const testFunction = (secretUrl: string, number = 1) => {
        return UrlFetchApp.fetch(secretUrl + number)
    }

    /**@type {UrlFetchApp.HTTPResponse} */
    const response = useSecret(secretPath, testFunction, 2)
    const data = JSON.parse(response.getContentText())

    if (!Array.isArray(data) || (Array.isArray(data) && data[0]?.userId != 2)) {
        console.error(
            'useSecret Failed. Expected userId 2 got: ' + data[0]?.userId
        )
        return
    }

    console.log('useSecret Passed.')
}

function testFetchWithBasicAuth() {
    const secretPath = getSecretPath('TestFetchWithBasicAuth', 1)

    // secret contents: 'jc@graphicnapkin.com:superSecretPassword'
    fetchWithBasicAuth(secretPath, 'testing.com', { method: 'post' }, true)

    const stringParams = scriptProperties.getProperty('basicAuth')
    const params = stringParams ? JSON.parse(stringParams) : ''
    scriptProperties.deleteProperty('basicAuth')

    if (
        // @ts-ignore
        !params?.method == 'post' ||
        // @ts-ignore
        params?.Authorization !=
            'Basic amNAZ3JhcGhpY25hcGtpbi5jb206c3VwZXJTZWNyZXRQYXNzd29yZA=='
    ) {
        console.error(
            'fetchWithBasicAuth Failed. Expected method post and correct Auth and got: \n' +
                JSON.stringify(params)
        )
        return
    }

    console.log('fetchWithBasicAuth Passed.')
}

function testFetchWithBearerToken() {
    const secretPath = getSecretPath('TestFetchWithBasicAuth', 1)

    // secret contents: 'jc@graphicnapkin.com:superSecretPassword'
    fetchWithBearerToken(secretPath, 'testing.com', { method: 'post' }, true)

    const stringParams = scriptProperties.getProperty('bearerAuth')
    const params = stringParams ? JSON.parse(stringParams) : ''
    scriptProperties.deleteProperty('bearerAuth')

    if (
        // @ts-ignore
        !params?.method == 'post' ||
        // @ts-ignore
        params?.Authorization != 'jc@graphicnapkin.com:superSecretPassword'
    ) {
        console.error(
            'fetchWithBasicAuth Failed. Expected method post and correct Auth and got: \n' +
                JSON.stringify(params)
        )
        return
    }

    console.log('fetchWithBearerToken Passed.')
}

function getSecretPath(name: string, version: number) {
    return `projects/368381444370/secrets/${name}/versions/${version}`
}
