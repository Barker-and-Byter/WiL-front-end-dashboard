<!---SUPER AWESOME AND SUPER COOL LOGIN PAGE (YIPPEEE, YAHOO, YEHAWW)-->
<script lang="ts">
import { SignIn, SignOut } from '@auth/sveltekit/components';
import { page } from '$app/stores';
</script>
 
<h1 class="text-white">SvelteKit Auth Example</h1>
<div>
  {#if $page.data.session}
    {#if $page.data.session.user?.image}
      <img
        src={$page.data.session.user.image}
        class="avatar"
        alt="User Avatar"
      />
    {/if}
    <span class="signedInText text-white">
      <small>Signed in as</small><br />
      <strong>{$page.data.session.user?.name ?? "User"}</strong>
    </span>
    <SignOut>
      <div slot="submitButton" class="buttonPrimary text-white">Sign out</div>
    </SignOut>
  {:else}
    <span class="notSignedInText text-white">you are not signed in rn</span>
    <SignIn>
      <div slot="submitButton" class="buttonPrimary text-white">Sign in</div>
    </SignIn>
    <SignIn class="text-white" provider="github"/>
  {/if}
</div>
