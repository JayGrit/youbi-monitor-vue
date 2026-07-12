<script setup>
import { computed } from 'vue'
import { useMonitorApp } from './app/useMonitorApp'
import PageTabs from './components/PageTabs.vue'
import AccountsContainer from './containers/AccountsContainer.vue'
import AirouterQueueContainer from './containers/AirouterQueueContainer.vue'
import FailureLogsContainer from './containers/FailureLogsContainer.vue'
import FfmpegerQueueContainer from './containers/FfmpegerQueueContainer.vue'
import MonitorContainer from './containers/MonitorContainer.vue'
import OperatorDiagnosticsContainer from './containers/OperatorDiagnosticsContainer.vue'
import ServerContainer from './containers/ServerContainer.vue'
import SpeakerSegmentsContainer from './containers/SpeakerSegmentsContainer.vue'
import StaticAssetsContainer from './containers/StaticAssetsContainer.vue'
import SubmitterAuthorsContainer from './containers/SubmitterAuthorsContainer.vue'
import SubmitterContainer from './containers/SubmitterContainer.vue'
import TaskFlowContainer from './containers/TaskFlowContainer.vue'

const app = useMonitorApp()
const pageShellClass = computed(() => ['page-shell', app.flowPageOpen ? 'flow-page-shell' : ''])
</script>

<template>
  <main :class="pageShellClass">
    <PageTabs
      :active-page="app.activePage"
      :flow-page-open="app.flowPageOpen"
      @open-page="app.openPage"
    />

    <template v-if="!app.flowPageOpen">
      <MonitorContainer v-if="app.activePage === 'monitor'" :app="app" />
      <SubmitterContainer v-else-if="app.activePage === 'submitter'" :app="app" />
      <StaticAssetsContainer v-else-if="app.activePage === 'static-assets'" :app="app" />
      <SubmitterAuthorsContainer v-else-if="app.activePage === 'submitter-authors'" :app="app" />
      <AccountsContainer v-else-if="app.activePage === 'accounts'" :app="app" />
      <ServerContainer v-else-if="app.activePage === 'server'" :app="app" />
      <FfmpegerQueueContainer v-else-if="app.activePage === 'ffmpeger'" :app="app" />
      <AirouterQueueContainer v-else-if="app.activePage === 'airouter'" :app="app" />
      <SpeakerSegmentsContainer v-else-if="app.activePage === 'speaker'" :app="app" />
      <FailureLogsContainer v-else-if="app.activePage === 'failure-logs'" :app="app" />
      <OperatorDiagnosticsContainer v-else-if="app.activePage === 'operator-diagnostics'" :app="app" />
    </template>

    <TaskFlowContainer v-else :app="app" />
  </main>
</template>
