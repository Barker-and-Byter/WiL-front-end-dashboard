<!---SUPER AWESOME AND SUPER COOL LOGIN PAGE (YIPPEEE, YAHOO, YEHAWW)-->
<script lang="ts">
import { signIn, signOut } from "@auth/sveltekit/client"
import { page } from '$app/stores';

let title = "Dashi Boardi";

</script>


 
<!-- <h1 class="text-white">SvelteKit Auth Example</h1>
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
  {/if} -->
  <div class="flex flex-col items-center justify-center min-h-screen">
  <h1 class="text-9xl pt-10 font-black uppercase bg-clip-text text-transparent mb-20 bg-white/80 backdrop-blur-xl [-webkit-text-stroke:1px_rgba(255,255,255,0.2)] text-center" style="text-shadow: 0 10px 50px rgba(31,38,135,0.6);">
    Dashi Boardi
  </h1>
  <div class="w-full justify-center align-center max-w-md p-8 rounded-3xl bg-white/10 backdrop-blur-xl border border-white/20 shadow-[0_8px_32px_0_rgba(31,38,135,0.30)]">

  <div class="text-center mb-8">
    <h1 class="text-3xl font-bold text-transparent bg-clip-text bg-linear-to-r from-white to-white/70 tracking-tight">Log In</h1>
  </div>
  <form class="space-y-5">  
    <div class="space-y-4">
    <input class="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/20 text-white placeholder-white/40 backdrop-blur-md transition-all duration-300 focus:outline-none focus:bg-white/10 focus:border-white/40 focus:ring-2 focus:ring-indigo-500 " placeholder="Email address">
    <input class="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/20 text-white placeholder-white/40 backdrop-blur-md transition-all duration-300 focus:outline-none focus:bg-white/10 focus:border-white/40 focus:ring-2 focus:ring-indigo-500 " placeholder="Password">

</div>
    <button class="relative overflow-hidden flex px-8 py-3 rounded-2xl font-semibold text-white tracking-wide bg-white/10 backdrop-blur-xl border border-white/20 shadow-[0_8px_32px_0_rgba(31,38,135,0.30)] transition-all duration-300 ease-out hover:bg-white/20 hover:scale-105 hover:shadow-[0_8px_32px_0_rgba(31,38,135,0.5)] active:scale-95 active:bg-white/10 w-full justify-center text-lg mt-10">
         Sign In
    </button>
    <div class="mt-8 flex items-center justify-between">
        <span class="w-1/5 border-b border-white/20"></span>
        <span class="text-xs text-white/50 font-medium uppercase tracking-wider">or continue with</span>
        <span class="w-1/5 border-b border-white/20"></span>
    </div>
    <div class="grid grid-cols-2 gap-4 mt-6">
    <button onclick={() => signIn("google")} class="flex items-center justify-center gap-2 py-2.5 rounded-xl bg-white/5 border border-white/10 backdrop-blur-md hover:bg-white/10 transition-all duration-300 shadow-inner group">
        <svg class="w-5 h-5 text-white/90 group-hover:scale-110 transition-transform" viewBox="0 0 24 24" fill="currentColor"><path d="M12.545,10.239v3.821h5.445c-0.712,2.315-2.647,3.972-5.445,3.972c-3.332,0-6.033-2.701-6.033-6.032s2.701-6.032,6.033-6.032c1.498,0,2.866,0.549,3.921,1.453l2.814-2.814C17.503,2.988,15.139,2,12.545,2C7.021,2,2.543,6.477,2.543,12s4.478,10,10.002,10c8.396,0,10.249-7.85,9.426-11.748L12.545,10.239z"></path></svg>
        <span class="text-sm font-semibold text-white/90">Google</span>
    </button>
    <button onclick={() => signIn("github")} class=" w-full flex items-center justify-center gap-2 py-2.5 rounded-xl bg-white/5 border border-white/10 backdrop-blur-md hover:bg-white/10 transition-all duration-300 shadow-inner group">
        <svg class="w-5 h-5 text-white/90 group-hover:scale-110 transition-transform" viewBox="0 0 24 24" fill="currentColor"><path fill-rule="evenodd" clip-rule="evenodd" d="M12 2C6.477 2 2 6.477 2 12c0 4.42 2.865 8.166 6.839 9.489.5.092.682-.217.682-.482 0-.237-.008-.866-.013-1.7-2.782.604-3.369-1.34-3.369-1.34-.454-1.156-1.11-1.464-1.11-1.464-.908-.62.069-.608.069-.608 1.003.07 1.531 1.03 1.531 1.03.892 1.529 2.341 1.087 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.11-4.555-4.943 0-1.091.39-1.984 1.029-2.683-.103-.253-.446-1.27.098-2.647 0 0 .84-.269 2.75 1.025A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.294 2.747-1.025 2.747-1.025.546 1.379.203 2.394.1 2.647.64.699 1.028 1.592 1.028 2.683 0 3.842-2.339 4.687-4.566 4.935.359.309.678.919.678 1.852 0 1.336-.012 2.415-.012 2.743 0 .267.18.578.688.48C19.138 20.161 22 16.418 22 12c0-5.523-4.477-10-10-10z"></path></svg>
        <span class="text-sm font-semibold text-white/90">GitHub</span>
    </button>
    </div>
</form>
  </div>
</div>