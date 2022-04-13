import React, { Component } from "react"
import GraphiQL from "graphiql"
import GraphiQLExplorer from "graphiql-explorer"
import { buildClientSchema, getIntrospectionQuery, parse } from "graphql"
import { makeDefaultArg, getDefaultScalarArgValue } from "./CustomArgs"
import "graphiql/graphiql.css"
import "./App.css"

function createFetcher() {
  return (params) => {
    // Call to proxied endpoint
    return fetch('/.netlify/functions/graphql', {
      method: "POST",
      headers: {
        Accept: "application/json",
        "Content-Type": "application/json",
      },
      body: JSON.stringify(params)
    })
    .then((response) => {
      return response.text()
    })
    .then((responseBody) => {
      try {
        return JSON.parse(responseBody)
      } catch (e) {
        return responseBody
      }
    })
  }
}

const DEFAULT_QUERY = `## How to use the graphQL explorer! ##
#  1. Click the fields on the left to add queries, mutations & subscriptions
#  2. Click ▷ button to run the query, mutation or subscription

query blocksQuery {
  listVendia_BlockItems {
    nextToken
    Vendia_BlockItems {
      _id
      blockSchemaVersion
      blockId
      redactedBlockHash
      previousBlockId
      previousRedactedBlockHash
      blockHash
      previousBlockHash
      status
      commitTime
      _owner
      transactions {
        _id
        hash
        redactedHash
        signature
        version
        submissionTime
        mutations
        _owner
      }
    }
  }
}

# Send graphQL mutation
mutation exampleMutation {
  add_Product(
    input: {name: "widgets", description: "descr", price: 1.5, size: S}
    syncMode: NODE_LEDGERED
  ) {
    result {
      _id
      description
      name
      price
      size
      sku
      tags
      _owner
    }
  }
}
`

export default class App extends Component {
  state = {
    schema: null,
    query: DEFAULT_QUERY,
    explorerIsOpen: true,
    url: null,
    key: null
  }

  constructor (props, context) {
    super(props, context)
    const fetcher = createFetcher()
    this._graphiql = GraphiQL
    this.fetcher = fetcher
  }

  componentDidMount() {

    this.fetcher({
      query: getIntrospectionQuery()
    }).then(result => {
      const editor = this._graphiql.getQueryEditor()
      editor.setOption("extraKeys", {
        ...(editor.options.extraKeys || {}),
        "Shift-Alt-LeftClick": this._handleInspectOperation
      })

      this.setState({
        schema: buildClientSchema(result.data)
      })
    })
  }

  _handleInspectOperation = (cm, mousePos) => {
    const parsedQuery = parse(this.state.query || "")

    if (!parsedQuery) {
      console.error("Couldn't parse query document")
      return null
    }

    var token = cm.getTokenAt(mousePos)
    var start = { line: mousePos.line, ch: token.start }
    var end = { line: mousePos.line, ch: token.end }
    var relevantMousePos = {
      start: cm.indexFromPos(start),
      end: cm.indexFromPos(end)
    }

    var position = relevantMousePos

    var def = parsedQuery.definitions.find(definition => {
      if (!definition.loc) {
        console.log("Missing location information for definition")
        return false
      }

      const { start, end } = definition.loc
      return start <= position.start && end >= position.end
    })

    if (!def) {
      console.error(
        "Unable to find definition corresponding to mouse position"
      )
      return null
    }

    var operationKind =
      def.kind === "OperationDefinition"
        ? def.operation
        : def.kind === "FragmentDefinition"
        ? "fragment"
        : "unknown"

    var operationName =
      def.kind === "OperationDefinition" && !!def.name
        ? def.name.value
        : def.kind === "FragmentDefinition" && !!def.name
        ? def.name.value
        : "unknown"

    var selector = `.graphiql-explorer-root #${operationKind}-${operationName}`

    var el = document.querySelector(selector)
    el && el.scrollIntoView()
  }

  _handleEditQuery = (query) => this.setState({ query })

  _handleToggleExplorer = () => {
    this.setState({
      explorerIsOpen: !this.state.explorerIsOpen
    })
  }

  render() {
    const { query, schema } = this.state
    return (
      <div className="graphiql-container">
        <GraphiQLExplorer
          schema={schema}
          query={query}
          onEdit={this._handleEditQuery}
          onRunOperation={operationName =>
            this._graphiql.handleRunQuery(operationName)
          }
          explorerIsOpen={this.state.explorerIsOpen}
          onToggleExplorer={this._handleToggleExplorer}
          getDefaultScalarArgValue={getDefaultScalarArgValue}
          makeDefaultArg={makeDefaultArg}
        />
        <GraphiQL
          ref={ref => (this._graphiql = ref)}
          fetcher={this.fetcher}
          schema={schema}
          query={query}
          onEditQuery={this._handleEditQuery}
        >
          <GraphiQL.Toolbar>
            <GraphiQL.Button
              onClick={() => this._graphiql.handlePrettifyQuery()}
              label="Prettify"
              title="Prettify Query (Shift-Ctrl-P)"
            />
            <GraphiQL.Button
              onClick={() => this._graphiql.handleToggleHistory()}
              label="History"
              title="Show History"
            />
            <GraphiQL.Button
              onClick={this._handleToggleExplorer}
              label="Explorer"
              title="Toggle Explorer"
            />
          </GraphiQL.Toolbar>
        </GraphiQL>
      </div>
    )
  }
}
