<script setup>
import { formatJson, isLongValue } from '../../utils/jsonDisplay'

defineProps({
  tables: { type: Array, default: () => [] },
  tableColumns: { type: Function, required: true },
  tableCellText: { type: Function, required: true },
  tableCellSummary: { type: Function, required: true },
})
</script>

<template>
  <div class="flow-section">
    <h4>Database Rows</h4>
    <div v-if="tables.length" class="table-stack">
      <article v-for="table in tables" :key="table.name" class="raw-table">
        <div class="raw-table-head">
          <strong>{{ table.name }}</strong>
          <span>{{ table.rows.length }} rows<template v-if="table.truncated">, truncated</template></span>
        </div>
        <div class="raw-table-scroll">
          <table>
            <thead>
              <tr>
                <th v-for="column in tableColumns(table)" :key="column">{{ column }}</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="(row, rowIndex) in table.rows" :key="row.id || row.task_id || rowIndex">
                <td v-for="column in tableColumns(table)" :key="column">
                  <span v-if="!isLongValue(row[column])">{{ tableCellText(column, row[column]) }}</span>
                  <details v-else>
                    <summary>{{ tableCellSummary(column, row[column]) }}</summary>
                    <pre>{{ formatJson(row[column]) }}</pre>
                  </details>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </article>
    </div>
    <p v-else class="flow-muted">No database rows.</p>
  </div>
</template>
