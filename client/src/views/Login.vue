<template lang="">
	<div class="container">
		<h1 class="text-center">Login Page!</h1>
		<div class="row">
			<div class="col-5">
				<div class="card">
					<div class="card-header">Login</div>
					<div class="card-body">
						<h4 class="card-title">Login to the Hoster List</h4>
						<hr />
						<form class="card-text" id="loginForm" data-bitwarden-watching="1">
							<fieldset>
								<div class="form-group">
									<label for="username" class="form-label mt-4">Username</label>
									<input
										type="text"
										class="form-control"
										id="usernamelogin"
										name="username"
										placeholder="Enter Username"
									/>
								</div>
								<div class="form-group">
									<label for="password" class="form-label mt-4">Password</label>
									<input
										type="password"
										class="form-control"
										name="password"
										id="passwordlogin"
										placeholder="Password"
									/>
								</div>

								<button type="submit" class="mt-4 btn btn-primary">Submit</button>
							</fieldset>
						</form>
					</div>
				</div>
			</div>
			<div class="col">
				<p class="text-muted">If you got here by accident i would recommend you go home</p>
			</div>
		</div>
	</div>
</template>
<script>
export default {};
</script>
<style lang=""></style>
