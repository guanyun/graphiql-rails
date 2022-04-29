document.addEventListener("DOMContentLoaded", function(event) {
  var graphiqlContainer = document.getElementById("graphiql-container");
  var parameters = {};

  var queryParams = graphiqlContainer.dataset.queryParams;

  function onEditQuery(newQuery) {
    parameters.query = newQuery;
    updateURL();
  }
  function onEditVariables(newVariables) {
    parameters.variables = newVariables;
    updateURL();
  }
  function updateURL() {
    var newSearch = '?' + Object.keys(parameters).map(function (key) {
      return encodeURIComponent(key) + '=' +
        encodeURIComponent(parameters[key]);
    }).join('&');
    history.replaceState(null, null, newSearch);
  }

  if (queryParams === 'true') {
    // Parse the search string to get url parameters.
    var search = window.location.search;
    search.substr(1).split('&').forEach(function (entry) {
      var eq = entry.indexOf('=');
      if (eq >= 0) {
        parameters[decodeURIComponent(entry.slice(0, eq))] =
          decodeURIComponent(entry.slice(eq + 1));
      }
    });
    // if variables was provided, try to format it.
    if (parameters.variables) {
      try {
        parameters.variables =
          JSON.stringify(JSON.parse(parameters.variables), null, 2);
      } catch (e) {
        // Do nothing, we want to display the invalid JSON as a string, rather
        // than present an error.
      }
    }
    // When the query and variables string is edited, update the URL bar so
    // that it can be easily shared
  }


  // Defines a GraphQL fetcher using the fetch API.
  var graphQLEndpoint = graphiqlContainer.dataset.graphqlEndpointPath;
  var providedHeaders = JSON.parse(graphiqlContainer.dataset.headers)
  function graphQLFetcher(graphQLParams, options) {
    return fetch(graphQLEndpoint, {
      method: 'post',
      headers: {...providedHeaders, ...options.headers},
      body: JSON.stringify(graphQLParams),
      credentials: 'include',
    }).then(function(response) {
      try {
        return response.json();
      } catch(error) {
        return {
          "status": response.status,
          "message": "The server responded with invalid JSON, this is probably a server-side error",
          "response": response.text(),
        };
      }
    })
  }

  var initial_query = graphiqlContainer.dataset.initialQuery;

  if (initial_query) {
    var defaultQuery = initial_query;
  } else {
    var defaultQuery = undefined;
  }


  // Render <GraphiQL /> into the body.
  var elementProps = {
    fetcher: graphQLFetcher,
    defaultQuery: defaultQuery,
    shouldPersistHeaders: true,
    headerEditorEnabled: graphiqlContainer.dataset.headerEditorEnabled === 'true'
  };
  
  Object.assign(elementProps, { query: parameters.query, variables: parameters.variables })
  if (queryParams === 'true') {
    Object.assign(elementProps, { onEditQuery: onEditQuery, onEditVariables: onEditVariables });
  }

  ReactDOM.render(
    React.createElement(GraphiQL, elementProps,
      React.createElement(GraphiQL.Logo, {}, graphiqlContainer.dataset.logo)
    ),
    document.getElementById("graphiql-container")
  );

  /**
   * Roles and Users Plugin
   */
  const topBar = document.querySelector('.topBar');
  const createUsersSelect = () => {
    const doc = {
      "query": "query AllRoles {\n  allRoles {\n id\n name\n users {\n id\n name\n token\n }\n}\n}\n",
      "variables": null,
      "operationName": "AllRoles"
    };

    graphQLFetcher(doc, {}).then(({ data }) => {
      if (!data?.allRoles.length) return;

      const options = [];

      for (let i = 0; i < data.allRoles.length; i++) {
        const role = data.allRoles[i];
        for (let j = 0; j < role.users.length; j++) {
          const user = role.users[j];
          options.push({ value: user.token, label: role.name + ': ' + user.name });
        }
      }

      const plugins = document.createElement('div');
      plugins.className = 'plugins';
      plugins.style.marginLeft = 'auto'
      topBar.append(plugins);

      const getCachedHeaders = () => {
        const key = 'graphiql:headers';
        const headers = localStorage.getItem(key) ? JSON.parse(localStorage.getItem(key)) : {};
        return headers;
      }

      const setCachedHeaders = (headers) => {
        const key = 'graphiql:headers';
        localStorage.setItem(key, JSON.stringify({ ...getCachedHeaders(), ...headers}));
      }

      const onChange = (evt) => {
        setCachedHeaders({ Authorization: evt.target.value });
        window.location.reload();
      }

      const cachedHeaders = getCachedHeaders(); 
      const defaultToken = cachedHeaders?.Authorization || '';

      ReactDOM.render(
        React.createElement('select',
          { onChange, value: defaultToken },
          options.map((option) => React.createElement('option', { value: option.value}, option.label))
        ),
        plugins
      );
    })

  }

  if (topBar) {
    createUsersSelect();
  }
});
