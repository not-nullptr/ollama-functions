<script lang="ts">
	export let href = "";
	export let title: string | undefined = undefined;
</script>

<a target="_blank" {href} {title}><slot></slot></a>
