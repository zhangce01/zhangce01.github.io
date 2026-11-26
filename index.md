---
layout: homepage
---

## About Me

Hi there! I'm **Ce Zhang** <span class="wave" aria-hidden="true">👋</span> I am currently a fourth-year PhD candidate in the Robotics Institute at Carnegie Mellon University (CMU), with an expected graduation of 2028.

<div class="edu-cards">
  <div class="edu-card">
    <div class="edu-head">
      <span class="edu-logo"><img src="./assets/img/logo_cmu.svg" alt="Carnegie Mellon University"></span>
      <div class="edu-head-text">
        <div class="edu-degree">Ph.D. in Robotics</div>
        <a class="edu-school" href="https://www.cmu.edu/" target="_blank" rel="noopener">Carnegie Mellon University</a>
      </div>
    </div>
    <div class="edu-note">
      <div class="edu-line">🗓️ 2025 – 2028 (expected)</div>
      <div class="edu-line">🤝 Advisor: <a href="https://www.cs.cmu.edu/~sycara/" target="_blank" rel="noopener">Prof. Katia Sycara</a></div>
    </div>
  </div>
  <div class="edu-card">
    <div class="edu-head">
      <span class="edu-logo"><img src="./assets/img/logo_cmu.svg" alt="Carnegie Mellon University"></span>
      <div class="edu-head-text">
        <div class="edu-degree">M.Sc. in Machine Learning</div>
        <a class="edu-school" href="https://www.cmu.edu/" target="_blank" rel="noopener">Carnegie Mellon University</a>
      </div>
    </div>
    <div class="edu-note">
      <div class="edu-line">🗓️ 2023 – 2024</div>
      <div class="edu-line">🤝 Advisor: <a href="https://www.cs.cmu.edu/~sycara/" target="_blank" rel="noopener">Prof. Katia Sycara</a></div>
    </div>
  </div>
  <div class="edu-card">
    <div class="edu-head">
      <span class="edu-logo"><img src="./assets/img/logo_sustech.png" alt="SUSTech"></span>
      <div class="edu-head-text">
        <div class="edu-degree">B.Eng. in Communication Engineering</div>
        <a class="edu-school" href="https://www.sustech.edu.cn/en/" target="_blank" rel="noopener">SUSTech</a>
      </div>
    </div>
    <div class="edu-note">
      <div class="edu-line">🗓️ 2019 – 2023</div>
      <div class="edu-line">🤝 Advisor: <a href="https://www.sustech.edu.cn/en/faculties/zhihaihe.html" target="_blank" rel="noopener">Prof. Zhihai He</a></div>
    </div>
  </div>
</div>

<p class="about-contact">Feel free to <a class="contact-link" href="mailto:cezhang@cs.cmu.edu">reach out</a> if you're interested in my work or would like to discuss potential collaborations!</p>

<div class="intern-box">
  <span class="intern-dot" aria-hidden="true"></span>
  <div class="intern-text">
    <div class="intern-title">Looking for a Summer 2027 Research Internship</div>
    <p>I'm seeking a research internship for Summer 2027. If you're interested, I'd love to hear from you: feel free to <a class="contact-link" href="mailto:cezhang@cs.cmu.edu">email me</a> or take a look at my <a class="contact-link" href="./{{ site.cv_link }}" target="_blank" rel="noopener">CV</a>.</p>
  </div>
</div>

## Research Interests

{% assign p_degf = site.data.publications.main | where_exp: "p", "p.title contains 'Self-Correcting Decoding'" | first %}
{% assign p_only = site.data.publications.main | where_exp: "p", "p.title contains 'ONLY:'" | first %}
{% assign p_vscan = site.data.publications.main | where_exp: "p", "p.title contains 'VScan:'" | first %}
{% assign p_pyspatial = site.data.publications.main | where_exp: "p", "p.title contains 'pySpatial:'" | first %}
{% assign p_echosafe = site.data.publications.main | where_exp: "p", "p.title contains 'Evolving Contextual Safety'" | first %}
{% assign p_webaggregator = site.data.publications.main | where_exp: "p", "p.title contains 'WebAggregator:'" | first %}
{% assign p_lens = site.data.publications.main | where_exp: "p", "p.title contains 'LENS:'" | first %}
{% assign p_streamscout = site.data.publications.main | where_exp: "p", "p.title contains 'StreamScout:'" | first %}
{% assign p_rsigame = site.data.publications.main | where_exp: "p", "p.title contains 'RSIGame:'" | first %}
{% assign p_video2skill = site.data.publications.main | where_exp: "p", "p.title contains 'Video2Skill:'" | first %}
{% assign p_morse = site.data.publications.main | where_exp: "p", "p.title contains 'MORSE:'" | first %}
{% assign p_grapebench = site.data.publications.main | where_exp: "p", "p.title contains 'GRAPE-Bench:'" | first %}

My research interests lie in general multi-modal large language models and agents, spanning recursive self-improvement and pre- and post-training. Here is a timeline of my work:

<div class="ri-map" id="ri-map">
  <ul class="ri-lines">
    <li data-line="a">Auto-Research &amp; Self-Improving Agents</li>
    <li data-line="b">Video Understanding &amp; Embodied AI</li>
    <li data-line="c">Responsible &amp; Efficient AI</li>
  </ul>
  <ol class="ri-stops">
    <li><a href="#pub-{{ p_degf.title | slugify }}" data-lines="c" data-year="2025" data-venue="{{ p_degf.conference_short | escape }}" data-title="{{ p_degf.title | escape }}">DeGF</a></li>
    <li><a href="#pub-{{ p_only.title | slugify }}" data-lines="c" data-year="2025" data-venue="{{ p_only.conference_short | escape }}" data-title="{{ p_only.title | escape }}">ONLY</a></li>
    <li><a href="#pub-{{ p_vscan.title | slugify }}" data-lines="b c" data-year="2026" data-venue="{{ p_vscan.conference_short | escape }}" data-title="{{ p_vscan.title | escape }}">VScan</a></li>
    <li><a href="#pub-{{ p_pyspatial.title | slugify }}" data-lines="b" data-year="2026" data-venue="{{ p_pyspatial.conference_short | escape }}" data-title="{{ p_pyspatial.title | escape }}">pySpatial</a></li>
    <li><a href="#pub-{{ p_echosafe.title | slugify }}" data-lines="c" data-year="2026" data-venue="{{ p_echosafe.conference_short | escape }}" data-title="{{ p_echosafe.title | escape }}">EchoSafe</a></li>
    <li><a href="#pub-{{ p_webaggregator.title | slugify }}" data-lines="a" data-year="2026" data-venue="{{ p_webaggregator.conference_short | escape }}" data-title="{{ p_webaggregator.title | escape }}">WebAggregator</a></li>
    <li><a href="#pub-{{ p_lens.title | slugify }}" data-lines="b c" data-year="2026" data-venue="{{ p_lens.conference_short | escape }}" data-title="{{ p_lens.title | escape }}">LENS</a></li>
    <li><a href="#pub-{{ p_streamscout.title | slugify }}" data-lines="b" data-year="2026" data-venue="{{ p_streamscout.conference_short | escape }}" data-title="{{ p_streamscout.title | escape }}">StreamScout</a></li>
    <li><a href="#pub-{{ p_rsigame.title | slugify }}" data-lines="a" data-year="2026" data-venue="{{ p_rsigame.conference_short | escape }}" data-title="{{ p_rsigame.title | escape }}">RSIGame</a></li>
    <li><a href="#pub-{{ p_video2skill.title | slugify }}" data-lines="b" data-year="2026" data-venue="{{ p_video2skill.conference_short | escape }}" data-title="{{ p_video2skill.title | escape }}">Video2Skill</a></li>
    <li><a href="#pub-{{ p_morse.title | slugify }}" data-lines="a b" data-year="2026" data-venue="{{ p_morse.conference_short | escape }}" data-title="{{ p_morse.title | escape }}">MORSE</a></li>
    <li><a href="#pub-{{ p_grapebench.title | slugify }}" data-lines="b c" data-year="2026" data-venue="{{ p_grapebench.conference_short | escape }}" data-title="{{ p_grapebench.title | escape }}">GRAPE-Bench</a></li>
  </ol>
</div>


## News

- <span class="news-date">Aug 2026</span> Wrapped up my summer internship at TikTok as a research scientist intern, where I worked on streaming video understanding.
- <span class="news-date">Jun 2026</span> Our paper "LENS: Adaptive Spatio-Temporal Zooming for Keyframe Sampling in Long-Form Videos" is accepted to ECCV 2026.
- <span class="news-date">Feb 2026</span> Our paper "Evolving Contextual Safety in Multi-Modal Large Language Models via Inference-Time Self-Reflective Memory" is accepted to CVPR 2026.
- <span class="news-date">Jan 2026</span> Our paper "pySpatial: Generating 3D Visual Programs for Zero-Shot Spatial Reasoning" is accepted to ICLR 2026.

<details class="news-more" markdown="0">
<summary>
  <span class="nm-more">Show more</span>
  <span class="nm-less">Show less</span>
  <span class="nm-chevron" aria-hidden="true"><svg width="12" height="12" viewBox="0 0 16 16" fill="none"><path d="M3 6l5 5 5-5" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg></span>
</summary>
<ul>
<li><span class="news-date">Jan 2026</span> Our paper "VScan: Rethinking Visual Token Reduction for Efficient Large Vision-Language Models" is accepted to TMLR.</li>
<li><span class="news-date">Mar 2025</span> I will be joining the Ph.D. in Robotics program at Carnegie Mellon University (CMU) in Fall 2025.</li>
<li><span class="news-date">Jan 2025</span> Our paper "Self-Correcting Decoding with Generative Feedback for Mitigating Hallucinations in Large Vision-Language Models" is accepted to ICLR 2025.</li>
</ul>
</details>

{% include_relative _includes/publications.md %}

## Experiences

<div class="exp-timeline">
  <div class="exp-item">
    <span class="exp-dot"></span>
    <div class="exp-card">
      <div class="exp-info">
        <div class="exp-role">Research Scientist Intern</div>
        <div class="exp-org">TikTok</div>
        <div class="exp-chips">
          <span class="chip">📍 San Jose, CA, USA</span>
          <span class="chip">🗓️ May – Aug 2026</span>
          <span class="chip">🤝 Mentor: Ming Zhou</span>
        </div>
      </div>
      <span class="exp-logo-chip"><img src="./assets/img/logo_tiktok.svg" alt="TikTok"></span>
    </div>
  </div>
  <div class="exp-item">
    <span class="exp-dot"></span>
    <div class="exp-card">
      <div class="exp-info">
        <div class="exp-role">Research Intern</div>
        <div class="exp-org">Tencent AI Lab</div>
        <div class="exp-chips">
          <span class="chip">📍 Shenzhen, China</span>
          <span class="chip">🗓️ Feb – Jul 2025</span>
          <span class="chip">🤝 Mentor: <a href="https://mayer123.github.io/" target="_blank" rel="noopener">Dr. Kaixin Ma</a></span>
        </div>
      </div>
      <span class="exp-logo-chip"><img src="./assets/img/logo_tencent_ailab.webp" alt="Tencent AI Lab"></span>
    </div>
  </div>
</div>

{% include_relative _includes/honors.md %}

{% include_relative _includes/service.md %}
