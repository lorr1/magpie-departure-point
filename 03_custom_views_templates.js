// In this file you can create your own custom view templates


// A view template is a function that returns a view,
// this functions gets some config (e.g. trial_data, name, etc.) information as input
// A view is an object, that has a name, CT (the counter of how many times this view occurred in the experiment),
// trials the maximum number of times this view is repeated
// and a render function, the render function gets CT and the magpie-object as input
// and has to call magpie.findNextView() eventually to proceed to the next view (or the next trial in this view),
// if it is an trial view it also makes sense to call magpie.trial_data.push(trial_data) to save the trial information

// In this view the user can click on buttons to label entities
const custom_entity_choice = function (config) {
    const view = {
        name: config.name,
        CT: 0,
        trials: config.trials,
        // The render functions gets the magpie object as well as the current trial in view counter as input
        render: function (CT, magpie) {
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
                    response_id: e.target.id,
                    response_alias: e.target.alias,
                    response_cand_qid: e.target.cand_qid,
                    response_alias_idx: e.target.alias_idx,
                    response_sent_idx: e.target.sent_idx,
                    response_doc_title: e.target.doc_title
                };
                // Often it makes sense to also save the config information
                // trial_data = magpieUtils.view.save_config_trial_data(config.data[CT], trial_data);

                // Here, we save the trial_data
                magpie.trial_data.push(trial_data);

                // Now, we will continue with the next view
                magpie.findNextView();
            };

            $("main").html(`
                        <div class='magpie-view'>
                        
                        <h1 class='magpie-view-title'>Pick the right entity</h1>
                        <div class="annotation-head"></div>
                            <div  id="sentence-text"  class="annotation-segment">                   
                        </div>
                        <div  id="entity-choices" class="annotation-choices-parent"></div>
                      `)


            $(document).ready(function () {
                // mentions is config.data[CT]
                var sentence = config.data[CT].sentence;
                //===========================================
                // ADDS THE SENTENCE
                //===========================================
                var sentence_split = sentence.split(" ");
                console.log(sentence_split)
                var prior_word_idx = 0
                config.data[CT].all_spans.forEach(function (mention_span, span_idx) {
                    // Add the left "plain text" span
                    if (prior_word_idx > 0 && prior_word_idx <= mention_span[0]) {
                        var new_span = document.createElement('span');
                        // Add white spaces around spans without the "marker" class as those are highlighted
                        console.log(sentence_split.slice(prior_word_idx, mention_span[0]).join(" ") + " ")
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
                    new_span.anno_id = span_idx
                    new_span.textContent = sentence_split.slice(mention_span[0], mention_span[1]).join(" ")
                    $("#sentence-text").append(new_span)
                    prior_word_idx = mention_span[1]
                });
                // Add the final right "plain text" span
                if (prior_word_idx < sentence_split.length) {
                    var new_span = document.createElement('span');
                    new_span.textContent = " " + sentence_split.slice(prior_word_idx, sentence_split.length).join(" ")
                    $("#sentence-text").append(new_span)
                }

                //===========================================
                // ADDS THE BUTTONS (WITH NONE OF THE ABOVE OPTION)
                //===========================================
                config.data[CT].candidates.forEach(function (cand_qid, cand_idx) {
                    var new_div = document.createElement('div');
                    new_div.className = "annotation-choice"
                    // The button carries the information to the click handler. So we need to store relevant mention information in the button
                    var button_div = document.createElement("button");
                    button_div.className = "button-choice magpie-respond-sentence";
                    button_div.id = "button_" + cand_idx.toString();
                    button_div.alias = config.data[CT].alias;
                    button_div.cand_qid = cand_qid;
                    button_div.alias_idx = config.data[CT].alias_idx;
                    button_div.sent_idx = config.data[CT].sent_idx;
                    button_div.doc_title = config.data[CT].doc_title;
                    button_div.textContent = "[" + ((cand_idx+1)%10).toString() + "] " + cand_qid;

                    // Div for button and description
                    var sub_div = document.createElement("div");
                    sub_div.className = "button-desc magpie-view-text";
                    sub_div.innerHTML = "<b></b><a href=\"https://www.wikidata.org/wiki/" + cand_qid + "\" target=\"_blank\">" +
                        config.data[CT].candidate_titles[cand_idx]  + "</a></b>"
                    sub_div.innerHTML += ": " + config.data[CT].candidate_descriptions[cand_idx]
                    new_div.appendChild(button_div);
                    new_div.appendChild(sub_div);
                    $('#entity-choices').append(new_div);

                    // Add button call backs after being added to DOM
                    $("#button_" + cand_idx.toString()).on("click", handle_click);
                });
                // ADD NONE OF THE ABOVE OPTION
                var new_div = document.createElement('div');
                new_div.className = "annotation-choice"
                // The button carries the information to the click handler. So we need to store relevant mention information in the button
                var button_div = document.createElement("button");
                button_div.className = "magpie-respond-sentence button-choice";
                button_div.id = "button_9";
                button_div.alias = config.data[CT].alias;
                button_div.cand_qid = "NA";
                button_div.alias_idx = config.data[CT].alias_idx;
                button_div.sent_idx = config.data[CT].sent_idx;
                button_div.doc_title = config.data[CT].doc_title;
                button_div.textContent = "[0] NA";

                // Div for button and description
                var sub_div = document.createElement("div");
                sub_div.className = "magpie-view-text button-desc";
                sub_div.innerHTML += "The answer is none of the above"
                new_div.appendChild(button_div);
                new_div.appendChild(sub_div);
                $('#entity-choices').append(new_div);

                // Add button call backs after being added to DOM
                $("#button_9").on("click", handle_click);


                window.addEventListener("keydown", function (event) {
                    event.preventDefault();
                    // If key is 0-9
                    if(event.keyCode >= 48 && event.keyCode <= 57) {
                        cand_idx = (parseInt(event.key)+9)%10
                        // +1 for None of the Above option
                        if (cand_idx < config.data[CT].candidates.length+1) {
                            $("#button_" + cand_idx.toString()).click();
                        }
                    }
                }, true);
            });
        }
    };
    // We have to return the view, so that it can be used in 05_views.js
    return view;
};