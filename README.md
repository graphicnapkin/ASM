# AppsScript Secrets Manager

Enabling you to easily fetch secrets from GCP Secrets Manager to use in your AppsScript projects. View the compiled output at https://script.google.com/home/projects/19bkwDLT1xtSGoXnHo_aoNft_A9h4h0IP5H0dwi2ScX45qxGk7uw3nPIZ

## Step 0: Create your Secrets (if you don't have any)

-   Follow steps <a href="https://cloud.google.com/appengine/docs/standard/nodejs/building-app/creating-project">here</a> to create a GCP project.
-   Follow steps <a href="https://cloud.google.com/secret-manager/docs/create-secret-quickstart">here</a> to create new secrets inside a GCP project.
-   On the `Permissions` tab click `Grant Access` and grant your users or groups access to this secret with the `Secret Manager Secret Accessor` role. This role will enable them to _only_ access this secret via API, not even through the GCP console. If you wish the to also have access via the console, add additional appropriate roles specific to your use case.

## Step 1: Creating an Internal AppsScript Library

-   Create an apps script project at script.google.com.
-   Click on the gear for settings and check the `Show "appsscript.json" manifest file in the editor` checkbox.
-   Click on the `<>` icon to bring up the code editor.
-   Click on the appscript.json file and add in the `oauthScopes` key with the list of strings from the example in this repository.
-   Click on `Code.gs` and replace the contents of this file with the contents of the `Code.js` file in this repository.
-   Save the file and run the getSecret function by selecting it form the dropdown on the top of the toolbar and hitting the Run button. This should force an OAuth consent screen to appear, and you will want to authorize it with your account.
-   Click on the `Deploy` button on the top right, then `New Deployment`
-   On the left click the gear to the right of `Select type` and choose `Library`
-   Enter a description of your choice then click `Deploy`
-   Click on the Share button on the top left (looks like a profile icon with a +)
-   Add in the desired individual users, groups or change to anyone in your organization or public

## Step 1: Alternative, use ASM library
-   In your Apps Script file click the + next to libraries
-   Paste in this scriptID: 19bkwDLT1xtSGoXnHo_aoNft_A9h4h0IP5H0dwi2ScX45qxGk7uw3nPIZ
-   Import with whatever name you choose (ASM recommended)

## Step 2: Using the Library

-   Inside a script that you would like to access a secret, click on `<>` to bring up the code editor.
-   Click on the `+` to the right of `Libraries` underneath the files in this project.
-   Search for your Library by the script ID which can be found between /projects/ and /edit when looking at the url of your library file. I recommend aliasing this as GASM
-   Recommended: Utlize the `useSecret` function which takes in as arguments:
    * proejctID:  The numbericalID for your GCP project.
    * secretName: The name you gave the secret in Secret Manager.
    * secretVersion: Intiger representing the version of the secret, this will be 1 if you have not edited the value.
    * A callback function that will utlize the secret: This function should take as it's first argument the fetched secrets value. It can have any number of additional arguments which will be passed to the callback function.
-   Checkout the fetchWithBasicAuth and fetchWithBearerAuth if you are making a simple API call for ever better secrets management.

# Motivation

There is no clear path for securley storing API secrets inside Google AppsScript. Most projects will use either ScriptProperties or UserProperties. Script Properties can be seen clearly in the UI since the updated IDE launched. UserProperties are more obscured but it still doesn't align well with most organizations security practices and feels more like security through obscurity than a real robust solution. GCP has a great solution for this (Secrets Manager) and in discussion with a friend it seemed like a simple integration would not be that hard to implement.

## Other Thoughts

This project is likely only useful for Google Workspace / GCP Administrators. I chose not to make this a public Library and my reasoning for this was I feel most security organizations that would find this useful would likely also have a requirement to "self host" to ensure full control of the codebase. This may change in the future.
