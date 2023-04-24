//declare var scriptProperties: GoogleAppsScript.Properties.Properties

function runTests() {
    if (!testProjectId) {
        console.log(
            `You must add your project Id as a script property 'projectId' before running tests.
            You can do so by passing in a project ID to the setTestingProjectId function `
        )
        return
    }
    testGetUnsafeSecret()
    testUseSecret()
    testFetchWithBasicAuth()
    testFetchWithBearerToken()
}

function setTestingProjectId(projectId = '') {
    userProperties.setProperty('projectId', projectId)
}

function testGetUnsafeSecret() {
    // secret contents: 'UNSAFE_SECRET'
    const secret = getUnsafeSecret(
        testProjectId || '',
        'TestGetUnsafeSecret',
        1
    )

    if (secret != 'UNSAFE_SECRET') {
        console.error(
            "getUnsafeSecret Failed. Expected 'UNSAFE_SECRET' got: " + secret
        )
        return
    }

    try {
        getUnsafeSecret(testProjectId || '', 'notreal', 1)
    } catch (err) {
        if (!err.toString().includes('Error: Secret not found')) {
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
    /**
     * @param secretUrl
     * @param number
     * @returns {UrlFetchApp.HTTPResponse}
     */
    const testFunction = (secretUrl: string, number = 1) => {
        return UrlFetchApp.fetch(secretUrl + number)
    }

    /**@type {UrlFetchApp.HTTPResponse} */
    // secret contents: 'https://jsonplaceholder.typicode.com/posts?userId='
    const response = useSecret(
        testProjectId || '',
        'TestUseUnsafeSecret',
        1,
        testFunction,
        2
    )
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
    // secret contents: 'jc@graphicnapkin.com:superSecretPassword'
    fetchWithBasicAuth(
        testProjectId || '',
        'TestFetchWithBasicAuth',
        1,
        'testing.com',
        { method: 'post' },
        true
    )

    const stringParams = userProperties.getProperty('basicAuth')
    const params = stringParams ? JSON.parse(stringParams) : ''
    userProperties.deleteProperty('basicAuth')

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
    // secret contents: 'jc@graphicnapkin.com:superSecretPassword'
    fetchWithBearerToken(
        testProjectId || '',
        // re using BasicAuth secret here as new secret adds no value
        'TestFetchWithBasicAuth',
        1,
        'testing.com',
        { method: 'post' },
        true
    )

    const stringParams = userProperties.getProperty('bearerAuth')
    const params = stringParams ? JSON.parse(stringParams) : ''
    userProperties.deleteProperty('bearerAuth')

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
