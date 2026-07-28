<h2 id="publications" style="margin: 2px 0 0;">Publications</h2>

{% assign pubs_by_year = site.data.publications.main | group_by: "year" %}
<div class="year-timeline">
{% for group in pubs_by_year %}
  <a href="#year-{{ group.name }}" class="yt-node">
    <span class="yt-dot"></span>
    <span class="yt-year">{{ group.name }}</span>
    <span class="yt-count">{{ group.items | size }} papers</span>
  </a>
  <span class="yt-seg">
    {% for paper in group.items %}
    <a class="yt-pip" href="#pub-{{ paper.title | slugify }}" aria-label="{{ paper.title }}">
      <span class="yt-tip"><strong>{{ paper.conference_short }}</strong>{{ paper.title }}</span>
    </a>
    {% endfor %}
  </span>
{% endfor %}
</div>

<div class="publications">
<ol class="bibliography">

{% assign last_year = "" %}
{% for link in site.data.publications.main %}

{% if link.year and link.year != last_year %}
<h2 class="year" id="year-{{ link.year }}">{{ link.year }}</h2>
{% assign last_year = link.year %}
{% endif %}

<li id="pub-{{ link.title | slugify }}">
<div class="pub-row">
  <div class="col-sm-3 abbr" style="position: relative;padding-right: 15px;padding-left: 15px;">
    {% if link.image %} 
    <img src="{{ link.image }}" alt="{{ link.title }}" class="teaser img-fluid z-depth-1">
    {% endif %}
    {% if link.conference_short %} 
    <abbr class="badge">{{ link.conference_short }}</abbr>
    {% endif %}
  </div>
  <div class="col-sm-9" style="position: relative;padding-right: 15px;padding-left: 20px;">
      <div class="title"><a href="{{ link.pdf }}">{{ link.title }}</a></div>
      <div class="author">{{ link.authors }}</div>
      <div class="periodical"><em>{{ link.conference }}</em></div>
      {% if link.conference2 %} 
      <div class="periodical"> Also at <em>{{ link.conference2 }}</em></div>
      {% endif %}
      {% if link.place %} 
      <div class="place">{{ link.place }}</div>
      {% endif %}
      {% if link.notes %} 
      <div class="notes"><strong> <i style="color:#e74d3c">{{ link.notes }}</i></strong></div>
      {% endif %}
    <div class="links">
      {% if link.pdf %} 
      <a href="{{ link.pdf }}" class="btn btn-sm z-depth-0" role="button" target="_blank" style="font-size:12px;">PDF</a>
      {% endif %}
      {% if link.website %} 
      <a href="{{ link.website }}" class="btn btn-sm z-depth-0" role="button" target="_blank" style="font-size:12px;">Website</a>
      {% endif %}
      {% if link.video %} 
      <a href="{{ link.video }}" class="btn btn-sm z-depth-0" role="button" target="_blank" style="font-size:12px;">Video</a>
      {% endif %}
      {% if link.code %}
      <a href="{{ link.code }}" target="_blank">
      <img src="{{ link.badge }}" alt="GitHub Stars" style="height: 18px; vertical-align: middle; margin-top: -2px">
      </a>
      {% endif %}
      {% if link.page %} 
      <a href="{{ link.page }}" class="btn btn-sm z-depth-0" role="button" target="_blank" style="font-size:12px;">Project Page</a>
      {% endif %}
      {% if link.abstract %}
      <a class="btn btn-sm z-depth-0 toggle-pub" role="button" data-target="abs-{{ forloop.index }}" style="font-size:12px;cursor:pointer;">Abstract</a>
      {% endif %}
      {% if link.bibtex %}
      <a class="btn btn-sm z-depth-0 toggle-pub" role="button" data-target="bib-{{ forloop.index }}" style="font-size:12px;cursor:pointer;">BibTeX</a>
      {% endif %}
      {% if link.others %} 
      {{ link.others }}
      {% endif %}
    </div>
    {% if link.abstract %}
    <div id="abs-{{ forloop.index }}" class="abstract hidden"><p>{{ link.abstract }}</p></div>
    {% endif %}
    {% if link.bibtex %}
    <div id="bib-{{ forloop.index }}" class="bibtex hidden"><button class="copy-bib" type="button">Copy</button><pre>{{ link.bibtex | xml_escape }}</pre></div>
    {% endif %}
  </div>
</div>
</li>

<br>

{% endfor %}

</ol>
</div>

