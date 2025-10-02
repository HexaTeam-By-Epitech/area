<script setup>
</script>

<template>
  <main class="content" aria-labelledby="page-title">
    <h1 id="page-title" class="title">Supercharge Your Day with AREA</h1>
    <h2 class="subtitle">Automate. Simplify. Achieve more.</h2>

    <section class="section" aria-labelledby="why-area">
      <h3 id="why-area" class="sectionTitle">Why AREA?</h3>
      <p class="paragraph">
        Stop wasting time on repetitive tasks. AREA automates your apps so you can focus on what really matters.
        Connect everything in one place and let your digital life flow seamlessly.
      </p>
    </section>

    <section class="section" aria-labelledby="benefits">
      <h3 id="benefits" class="sectionTitle">Benefits You'll Love</h3>
      <ul class="list">
        <li class="bullet">Save hours every week</li>
        <li class="bullet">Stay organized effortlessly</li>
        <li class="bullet">Get smart notifications when it matters</li>
        <li class="bullet">Keep all your favorite services connected</li>
      </ul>
    </section>

    <section class="section" aria-labelledby="use-cases">
      <h3 id="use-cases" class="sectionTitle">Real-Life Use Cases</h3>
      <p class="paragraph">
        Receive an important attachment? AREA saves it to your cloud automatically.
        New task in your project? Your team gets notified instantly.
        Less stress, more results.
      </p>
    </section>
  </main>
</template>

<style scoped>
/* Layout */
.content {
  max-width: 760px;
  margin: 48px auto;
  padding: 0 16px;
}

.section {
  margin: 32px 0;
}

/* Typography */
.title {
  font-size: 34px;
  line-height: 1.25;
  font-weight: 900;
  color: var(--text-primary);
  text-align: center;
  margin: 0 0 8px;
}

.subtitle {
  font-size: 20px;
  line-height: 1.5;
  color: var(--text-secondary);
  text-align: center;
  margin: 0 0 24px;
}

.sectionTitle {
  font-size: 22px;
  line-height: 1.4;
  font-weight: 800;
  color: var(--text-primary);
  text-align: center;
  margin: 0 0 12px;
}

.paragraph {
  font-size: 17px;
  line-height: 1.7;
  color: var(--text-primary);
  text-align: left;
  margin: 0 auto;
}

/* Lists */
.list {
  list-style: disc;
  padding-left: 20px;
  margin: 0 auto;
}

.bullet {
  font-size: 17px;
  line-height: 1.7;
  color: var(--text-primary);
  margin: 4px 0;
}
</style>