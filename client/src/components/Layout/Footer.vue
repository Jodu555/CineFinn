<template>
	<div>
		<footer class="footer">
			<p class="text-center text-muted footer-text">
				© Copyright
				{{ new Date().getFullYear() }}
				by <a href="https://Jodu555.de" target="_blank">Jodu555</a> /
				<a href="https://www.youtube.com/c/TRyFlow" target="_blank">TRyFlow</a> /
				<a href="https://jodu555.de/imprint">Impressum</a> /
				<a href="https://jodu555.de/privacy">Privacy Policy</a>
			</p>
		</footer>
	</div>
</template>
<script>
export default {};
</script>
<style>
.footer {
	position: absolute;
	background-color: --bs-body-color;
	height: 3.5rem;
	bottom: 0;
	width: 100%;
	margin-bottom: 0;
}

.footer-text {
	padding-top: 1rem;
}
</style>
