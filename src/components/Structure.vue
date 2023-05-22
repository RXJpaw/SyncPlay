<template>
    <div class="structure">
        <Content />
        <Footer />
    </div>
</template>

<script lang="ts">
import Content from '@/components/Structure/Content.vue'
import Footer from '@/components/Structure/Footer.vue'

export default {
    name: 'Structure',
    components: {
        Content,
        Footer
    },
    data() {
        return {}
    }
}
</script>

<style scoped>
.structure {
    position: absolute;
    top: 22px;

    display: flex;
    justify-content: center;

    width: 100%;
    height: calc(100% - 22px);

    background-color: #262626;
}
</style>
