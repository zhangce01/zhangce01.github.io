<h2 id="publications" style="margin: 2px 0px -15px;">Publications</h2>

<div class="publications">
<ol class="bibliography">

{% for link in site.data.publications.main %}

<li>
<div class="pub-row">
  <div class="col-sm-3 abbr" style="position: relative;padding-right: 15px;padding-left: 15px;">
    {% if link.image %} 
    <img src="{{ link.image }}" class="teaser img-fluid z-depth-1" style="width: 100; height: 60; object-fit: contain;">
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
      {% if link.supp %} 
      <a href="{{ link.supp }}" class="btn btn-sm z-depth-0" role="button" target="_blank" style="font-size:12px;">Supplementary</a>
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
      {% if link.bibtex %} 
      <a href="{{ link.bibtex }}" class="btn btn-sm z-depth-0" role="button" target="_blank" style="font-size:12px;">BibTex</a>
      {% endif %}
      {% if link.others %} 
      {{ link.others }}
      {% endif %}
    </div>
  </div>
</div>
</li>

<br>

{% endfor %}

</ol>
</div>

