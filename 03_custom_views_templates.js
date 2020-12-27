// In this file you can create your own custom view templates
const custom_screening = function(config) {
    const view = {
        name: config.name,
        CT: 0,
        trials: config.trials,
        // The render functions gets the magpie object as well as the current trial in view counter as input
        render: function (CT, magpie) {
            $('main').html(`
                  <div class='magpie-view'>
                    <h1 class='magpie-view-title'>${config.title}</h1>
                    <section class="magpie-text-container">
                    </section>
                  </div>`);

            $(document).ready(function() {
                var numAttempts = 0
                let next;
                let textInput;
                const minChars = config.data[CT].min_chars === undefined ? 10 : config.data[CT].min_chars;

                $(".magpie-view").append(`
                    <div id='question' class='magpie-view-question'>${config.data[CT].questions[numAttempts]}</div>
                    <div class='magpie-view-answer-container'>
                        <textarea name='textbox-input' rows=2 cols=30 class='magpie-response-text' />
                    </div>
                    <button id='next' class='magpie-view-button magpie-nodisplay'>Next</button>`);
                next = $("#next");
                question_area = $("#question");
                textInput = $("textarea");

                // attaches an event listener to the textbox input
                textInput.on("keyup", function() {
                    // if the text is longer than (in this case) 10 characters without the spaces
                    // the 'next' button appears
                    if (textInput.val().trim().length > minChars) {
                        next.removeClass("magpie-nodisplay");
                    } else {
                        next.addClass("magpie-nodisplay");
                    }
                });

                // the trial data gets added to the trial object
                next.on("click", function() {
                    var response = textInput.val().trim()
                    if (response.length > 0) {
                        response = response.toLowerCase();
                    }
                    if (response === config.data[CT].answers[numAttempts].toLowerCase() && numAttempts < 3) {
                        magpie.findNextView();
                    } else {
                        numAttempts += 1;
                        if (numAttempts >= 3) {
                            question_area.text('I am sorry. You have answered too many questions wrong to continue');
                            textInput.val('')
                        } else {
                            question_area.text(config.data[CT].questions[numAttempts]);
                            textInput.val('');
                        }
                    }
                });
            });
        }
    };
    // We have to return the view, so that it can be used in 05_views.js
    return view;
};

// A view template is a function that returns a view,
// this functions gets some config (e.g. trial_data, name, etc.) information as input
// A view is an object, that has a name, CT (the counter of how many times this view occurred in the experiment),
// trials the maximum number of times this view is repeated
// and a render function, the render function gets CT and the magpie-object as input
// and has to call magpie.findNextView() eventually to proceed to the next view (or the next trial in this view),
// if it is an trial view it also makes sense to call magpie.trial_data.push(trial_data) to save the trial information
// In this view the user can click on buttons to label entities
const custom_entity_choice = function (config, triggerNextView) {
    const view = {
        name: config.name,
        CT: 0,
        trials: config.trials,
        // The render functions gets the magpie object as well as the current trial in view counter as input
        render: function (CT, magpie) {
            let startTime = Date.now();
            const links_clicked = [];
            var selection = null;


            // Assuming we have an empty <div id="container"></div> in
            // HTML


            // Here, you can do whatever you want, eventually you should call magpie.findNextView()
            // to proceed to the next view and if it is an trial type view,
            // you should save the trial information with magpie.trial_data.push(trial_data)

            // Normally, you want to display some kind of html, to do this you append your html to the main element
            // You could use one of our predefined html-templates, with (magpie.)stimulus_container_generators["<view_name>"](config, CT)
            // console.log(magpie.stimulus_container_generators["fixed_text"]({title: 'My Stupid Title', text: 'Some text'}, CT))

            // This function will handle  the response
            const handle_click = function (e) {
                // We will just save the response and continue to the next view
                let trial_data = {
                    trial_name: config.name,
                    trial_number: CT,
                    trial_time: Date.now() - startTime,
                    rand_worker_num: config.rand_worker_num,
                    guid_idx: selection.target.guid_idx,
                    response_id: selection.target.id,
                    response_alias: selection.target.alias,
                    response_cand_qid: selection.target.cand_qid,
                    response_alias_idx: selection.target.alias_idx,
                    span_l: selection.target.span_l,
                    response_sent_idx: selection.target.sent_idx,
                    response_doc_title: selection.target.doc_title,
                    is_gold_example: config.is_gold_example,
                    metadata_links_clicked: links_clicked,
                };
                // Often it makes sense to also save the config information
                // trial_data = magpieUtils.view.save_config_trial_data(config.data[CT], trial_data);
                triggerNextView(trial_data);
            };

            const handle_button_click = function (e) {
                // Any earlier button selection should be cleared
                if (selection != null) {
                    $('#' + selection.target.id).css('background-color', 'rgb(239, 239, 239)');
                } else {
                    // Add button call backs after being added to DOM
                    $("#enter").on("click", handle_click);
                }
                // Assign the button to be selected
                selection = e;

                $(`#${selection.target.id}`).css('background-color', 'rgba(176, 189, 238, 0.85)');

            };


            const handle_link_click = function (e) {
                links_clicked.push(
                    [e.target.id.split('_')[1], e.target.href]
                );
            };

            $("main").html(`
                        <div class='magpie-view'>
                        <div style="width:30%">
                            <div class="progress" id="outer-progress"></div>
                            <div class="progress" id="progress"></div>
                        </div>
                        <h1 class='magpie-view-title'>Choose the Right Entity</h1>
                        <h6 class="my-magpie-view-text" style="text-align: center; margin: auto">(Taken from Wikipedia page for <a href="" id="wikipage_link">  </a>)</h6>
                        <div class="annotation-head"></div>
                            <div  id="sentence-text"  class="annotation-segment my-magpie-view-text">                   
                        </div>
                        <div  id="entity-choices" class="annotation-choices-parent my-magpie-view-text"></div>
                        <div  id="entity-enter" class="my-magpie-view-text" style="text-align: right;"></div>
                      `);

            $(document).ready(function () {
                // Add document title
                document.getElementById('wikipage_link').href = "https://en.wikipedia.org/wiki/" + convert_wikipedia_title(config.data[CT]["doc_title"]);
                document.getElementById('wikipage_link').innerHTML = config.data[CT]["doc_title"];
                document.getElementById('wikipage_link').target = "_blank";
                // mentions is config.data[CT]
                var sentence = config.data[CT].sentence;
                //===========================================
                // ADDS THE SENTENCE
                //===========================================
                var sentence_split = sentence.split(" ");
                var prior_word_idx = 0;
                config.data[CT].all_spans.forEach(function (mention_span, span_idx) {
                    // Add the left "plain text" span
                    if (prior_word_idx <= mention_span[0]) {
                        var new_span = document.createElement('span');
                        // Add white spaces around spans without the "marker" class as those are highlighted
                        new_span.textContent = sentence_split.slice(prior_word_idx, mention_span[0]).join(" ") + " "
                        if (span_idx > 0) {
                            new_span.textContent = " " + new_span.textContent;
                        }
                        $("#sentence-text").append(new_span)
                    }
                    // Adds the "highlighted" mention span
                    var new_span = document.createElement('span');
                    if (span_idx === config.data[CT].alias_idx) {
                        new_span.className = "marker-anno"
                    } else {
                        new_span.className = "marker"
                    }
                    new_span.anno_id = span_idx;
                    new_span.textContent = sentence_split.slice(mention_span[0], mention_span[1]).join(" ");
                    $("#sentence-text").append(new_span);
                    prior_word_idx = mention_span[1]
                });
                // Add the final right "plain text" span
                if (prior_word_idx < sentence_split.length) {
                    var new_span = document.createElement('span');
                    new_span.textContent = " " + sentence_split.slice(prior_word_idx, sentence_split.length).join(" ");
                    $("#sentence-text").append(new_span)
                }

                //===========================================
                // ADDS THE BUTTONS (WITH NONE OF THE ABOVE OPTION)
                //===========================================
                config.data[CT].candidates.forEach(function (cand_qid, cand_idx) {
                    var new_div = document.createElement('div');
                    new_div.className = "annotation-choice";
                    // The button carries the information to the click handler. So we need to store relevant mention information in the button
                    var button_div = document.createElement("button");
                    button_div.className = "button-choice magpie-respond-sentence";
                    button_div.id = "button_" + (cand_idx + 1).toString();
                    button_div.guid_idx = config.data[CT].guid_idx;
                    button_div.span_l = config.data[CT].span_l;
                    button_div.alias = config.data[CT].alias;
                    button_div.cand_qid = cand_qid;
                    button_div.alias_idx = config.data[CT].alias_idx;
                    button_div.sent_idx = config.data[CT].sent_idx;
                    button_div.doc_title = config.data[CT].doc_title;
                    button_div.innerHTML = "<span>[" + ((cand_idx + 1) % 10).toString() + "] </span>" + config.data[CT].candidate_titles[cand_idx];

                    // Div for button and description
                    var sub_div = document.createElement("div");
                    sub_div.className = "button-desc my-magpie-view-text";
                    link_id = "link_" + cand_idx.toString();
                    sub_div.innerHTML = "" +
                        "<b></b>" +
                        "<a id=" + link_id +
                        " href=\"https://en.wikipedia.org/wiki/" + convert_wikipedia_title(config.data[CT].candidate_titles[cand_idx]) + "\" target=\"_blank\">" +
                        config.data[CT].candidate_titles[cand_idx] + "</a></b>";
                    sub_div.innerHTML += ": " + config.data[CT].candidate_descriptions[cand_idx];
                    new_div.appendChild(button_div);
                    new_div.appendChild(sub_div);
                    $('#entity-choices').append(new_div);

                    // Add button call backs after being added to DOM
                    $("#button_" + (cand_idx + 1).toString()).on("click", handle_button_click);
                    $("#link_" + (cand_idx + 1).toString()).on("click", handle_link_click);
                });
                // ADD NONE OF THE ABOVE OPTION
                var new_div = document.createElement('div');
                new_div.className = "annotation-choice";
                // The button carries the information to the click handler. So we need to store relevant mention information in the button
                var button_div = document.createElement("button");
                button_div.className = "magpie-respond-sentence button-choice";
                button_div.id = "button_0";
                button_div.guid_idx = config.data[CT].guid_idx;
                button_div.span_l = config.data[CT].span_l;
                button_div.alias = config.data[CT].alias;
                button_div.cand_qid = "NA";
                button_div.alias_idx = config.data[CT].alias_idx;
                button_div.sent_idx = config.data[CT].sent_idx;
                button_div.doc_title = config.data[CT].doc_title;
                button_div.textContent = "[0] NA";

                // Div for button and description
                var sub_div = document.createElement("div");
                sub_div.className = "my-magpie-view-text button-desc";
                sub_div.innerHTML += "The answer is none of the above"
                new_div.appendChild(button_div);
                new_div.appendChild(sub_div);
                $('#entity-choices').append(new_div);

                // Add button call backs after being added to DOM
                $("#button_0").on("click", handle_button_click);


                // Tell the user they have to press Enter
                var new_div = document.createElement('div');
                // new_div.className = "annotation-choice";
                var button_div = document.createElement("button");
                button_div.className = "magpie-respond-sentence button-choice";
                button_div.id = "enter";
                button_div.textContent = "[Enter] Confirm Selection";
                new_div.appendChild(button_div);
                $('#entity-enter').append(new_div);


                window.addEventListener("keydown", function (event) {
                    // If key is 0-9
                    if (event.keyCode >= 48 && event.keyCode <= 57) {
                        // event.preventDefault();
                        // cand_idx = (parseInt(event.key) + 9) % 10;
                        cand_idx = parseInt(event.key);
                        // +1 for None of the Above option
                        if (cand_idx < config.data[CT].candidates.length + 1) {
                            $("#button_" + cand_idx.toString()).click();
                        }
                    }
                    // If key is enter
                    if (event.keyCode === 13) {
                        event.preventDefault();
                        $("#enter").click();
                    }
                }, true);

                var bar = new ProgressBar.Line('#progress', {
                    strokeWidth: 2.3,
                    easing: 'easeInOut',
                    duration: 0,
                    color: '#0f7934',
                    trailColor: '#eee',
                    trailWidth: 1,
                    svgStyle: {width: '30%', height: '30%'},
                    text: {
                        style: {
                            // Text color.
                            // Default: same as stroke color (options.color)
                            color: 'pink',
                            // position: 'absolute',
                            // right: '0',
                            // top: '30px',
                            // padding: 0,
                            // margin: 0,
                            // transform: null
                        },
                        autoStyleContainer: true
                    },
                    from: {color: '#0f7934'},
                    to: {color: '#ED6A5A'},
                    step: (state, bar) => {
                        bar.setText(Math.round(bar.value() * 100) + ' %');
                    }
                });
                bar.set((CT + 1) / config.trials);  // Value from 0.0 to 1.0

                var outerbar = new ProgressBar.Line('#outer-progress',
                    {
                        strokeWidth: 2.3,
                        easing: 'easeInOut',
                        duration: 0,
                        color: '#ff7069',
                        trailColor: '#eee',
                        trailWidth: 1,
                        svgStyle: {width: '30%', height: '30%'},
                        text: {
                            style: {
                                // Text color.
                                // Default: same as stroke color (options.color)
                                color: 'pink',
                                // position: 'absolute',
                                // right: '0',
                                // top: '30px',
                                // padding: 0,
                                // margin: 0,
                                // transform: null
                            },
                            autoStyleContainer: true
                        },
                        from: {color: '#FFEA82'},
                        to: {color: '#ED6A5A'},
                        step: (state, bar) => {
                            outerbar.setText(Math.round(outerbar.value() * 100) + ' %');
                        }
                    }
                );
                outerbar.set(config.doc_progress);  // Value from 0.0 to 1.0


                // Start the clock
                // magpieTimer()
            });
        }
    };
    // We have to return the view, so that it can be used in 05_views.js
    return view;
};


const custom_entity_choice_doc = function (config) {
    const view = {
        name: config.name,
        CT: 0,
        trials: config.trials,
        // The render functions gets the magpie object as well as the current trial in view counter as input
        render: function (CT, magpie) {
            const labels = [];
            var sub_CT = 0;
            var startTime = Date.now();
            var endTime = -1;

            const start_labeling = function(e) {
                endTime = Date.now()
                sub_entity_choice.render(sub_CT, magpie)
            }

            // This function will handle  the response
            const handle_inner_view = function (trial_data) {
                // Gather inner data
                labels.push(trial_data)
                sub_CT += 1;
                if (sub_CT >= config.data[CT].mentions.length) {
                    labels.forEach(function (data, data_idx) {
                        data.doc_page_time = endTime-startTime;
                        magpie.trial_data.push(data);
                    });
                    magpie.findNextView();
                } else {
                    sub_entity_choice.render(sub_CT, magpie)
                }
            };

            const sub_entity_choice = custom_entity_choice({
                // This will use all trials specified in `data`, you can user a smaller value (for testing), but not a larger value
                trials: config.data[CT].mentions.length,
                // name should be identical to the variable name
                name: 'sub_entity_choice',
                data: config.data[CT].mentions,
                rand_worker_num: config.rand_worker_num,
                is_gold_example: config.is_gold_example,
                doc_progress: (global_docs_so_far + 1) / (config.total_trials),
            }, handle_inner_view);

            $("main").html(`
                        <div class='magpie-view'>
                        
                        <h1 class='magpie-view-title'>Passage to Label</h1>
                        <h6 class="my-magpie-view-text" style="text-align: center; margin: auto">(Taken from Wikipedia page for <a href="" id="wikipage_link">  </a>)</h6>
                        <div class="annotation-head"></div>
                            <div  id="sentence-text"  class="my-magpie-view-text">                   
                        </div>
                        <div  id="ready-button" class="my-magpie-view-text" style="text-align: right;"></div>
                      `);
            $(document).ready(function () {
                document.getElementById('wikipage_link').href = "https://en.wikipedia.org/wiki/" + convert_wikipedia_title(config.data[CT]["doc_title"]);
                document.getElementById('wikipage_link').innerHTML = config.data[CT]["doc_title"];
                document.getElementById('wikipage_link').target = "_blank";
                // mentions is config.data[CT]
                var new_span = document.createElement('span');
                new_span.textContent = config.data[CT]["doc_text"];
                $("#sentence-text").append(new_span)

                // Tell the user they have to press Enter
                var new_div = document.createElement('div');
                // new_div.className = "annotation-choice";
                var button_div = document.createElement("button");
                button_div.className = "magpie-respond-sentence button-choice";
                button_div.id = "enter";
                button_div.textContent = "[Enter] Begin Task";
                new_div.appendChild(button_div);
                $('#ready-button').append(new_div);
                $("#enter").on("click", start_labeling);

                window.addEventListener("keydown", function (event) {
                    // If key is enter
                    if (event.keyCode === 13) {
                        event.preventDefault();
                        $("#enter").click();
                    }
                }, true);
            });
            global_docs_so_far = global_docs_so_far + 1;
        }
    };
    // We have to return the view, so that it can be used in 05_views.js
    return view;
};