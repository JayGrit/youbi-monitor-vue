<script setup>
defineProps({
  submitterAuthorTypeError: { type: String, default: '' },
  submitterAuthorTypeRows: { type: Array, default: () => [] },
  submitterAuthorTypeSaving: { type: String, default: '' },
  submitterAuthorDeleting: { type: String, default: '' },
  autosaveSubmitterAuthorType: { type: Function, required: true },
  deleteSubmitterAuthor: { type: Function, required: true },
  backToSubmitter: { type: Function, required: true },
})
</script>

<template>
  <section class="submitter-author-page" aria-label="作者管理">
    <header class="submitter-author-page-header">
      <div>
        <h1>作者管理</h1>
      </div>
      <button type="button" @click="backToSubmitter">返回素材</button>
    </header>

    <section class="submitter-author-page-panel">
      <p v-if="submitterAuthorTypeError" class="inline-error">{{ submitterAuthorTypeError }}</p>
      <div class="submitter-author-type-body">
        <table class="submitter-author-type-table">
          <thead>
            <tr>
              <th>作者</th>
              <th>Type</th>
              <th>字幕</th>
              <th>配音</th>
              <th>分离</th>
              <th>重置封面</th>
              <th>原语言</th>
              <th>目标语言</th>
              <th>操作</th>
            </tr>
          </thead>
          <tbody>
            <tr v-if="submitterAuthorTypeRows.length === 0">
              <td colspan="9" class="submitter-empty">暂无作者</td>
            </tr>
            <tr v-for="row in submitterAuthorTypeRows" :key="row.author">
              <td>{{ row.author }}</td>
              <td>
                <input
                  v-model="row.draftType"
                  type="text"
                  placeholder="投稿 type"
                  :disabled="submitterAuthorTypeSaving === row.author"
                  @change="autosaveSubmitterAuthorType(row)"
                  @blur="autosaveSubmitterAuthorType(row)"
                />
              </td>
              <td>
                <label class="submitter-author-type-check">
                  <input
                    v-model="row.draftNeedSubtitle"
                    type="checkbox"
                    :disabled="submitterAuthorTypeSaving === row.author"
                    @change="row.draftNeedDubbing = row.draftNeedSubtitle && row.draftNeedDubbing; autosaveSubmitterAuthorType(row)"
                  />
                  <span>{{ row.draftNeedSubtitle ? '需要' : '跳过' }}</span>
                </label>
              </td>
              <td>
                <label class="submitter-author-type-check">
                  <input
                    v-model="row.draftNeedDubbing"
                    type="checkbox"
                    :disabled="submitterAuthorTypeSaving === row.author || !row.draftNeedSubtitle"
                    @change="autosaveSubmitterAuthorType(row)"
                  />
                  <span>{{ row.draftNeedDubbing ? '需要' : '原声' }}</span>
                </label>
              </td>
              <td>
                <label class="submitter-author-type-check">
                  <input
                    v-model="row.draftNeedSeparation"
                    type="checkbox"
                    :disabled="submitterAuthorTypeSaving === row.author"
                    @change="autosaveSubmitterAuthorType(row)"
                  />
                  <span>{{ row.draftNeedSeparation ? '需要' : '跳过' }}</span>
                </label>
              </td>
              <td>
                <label class="submitter-author-type-check">
                  <input
                    v-model="row.draftResetCover"
                    type="checkbox"
                    :disabled="submitterAuthorTypeSaving === row.author"
                    @change="autosaveSubmitterAuthorType(row)"
                  />
                  <span>{{ row.draftResetCover ? '重置' : '保留' }}</span>
                </label>
              </td>
              <td>
                <input
                  v-model="row.draftSourceLanguage"
                  type="text"
                  placeholder="英文"
                  :disabled="submitterAuthorTypeSaving === row.author || submitterAuthorDeleting === row.author"
                  @change="autosaveSubmitterAuthorType(row)"
                  @blur="autosaveSubmitterAuthorType(row)"
                />
              </td>
              <td>
                <input
                  v-model="row.draftTargetLanguage"
                  type="text"
                  placeholder="中文"
                  :disabled="submitterAuthorTypeSaving === row.author || submitterAuthorDeleting === row.author"
                  @change="autosaveSubmitterAuthorType(row)"
                  @blur="autosaveSubmitterAuthorType(row)"
                />
              </td>
              <td>
                <button
                  type="button"
                  class="submitter-author-delete"
                  :disabled="submitterAuthorDeleting === row.author || Boolean(submitterAuthorTypeSaving)"
                  @click="deleteSubmitterAuthor(row)"
                >
                  {{ submitterAuthorDeleting === row.author ? '删除中' : '删除' }}
                </button>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </section>
  </section>
</template>
