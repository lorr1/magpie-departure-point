// In this file you can create your own custom view templates


// A view template is a function that returns a view,
// this functions gets some config (e.g. trial_data, name, etc.) information as input
// A view is an object, that has a name, CT (the counter of how many times this view occurred in the experiment),
// trials the maximum number of times this view is repeated
// and a render function, the render function gets CT and the magpie-object as input
// and has to call magpie.findNextView() eventually to proceed to the next view (or the next trial in this view),
// if it is an trial view it also makes sense to call magpie.trial_data.push(trial_data) to save the trial information

// In this view the user can click on one of two buttons
const custom_press_a_button = function (config) {
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
                    trial_number: CT + 1,
                    response: e.target.id
                };
                // Often it makes sense to also save the config information
                // trial_data = magpieUtils.view.save_config_trial_data(config.data[CT], trial_data);

                // Here, we save the trial_data
                magpie.trial_data.push(trial_data);

                // Now, we will continue with the next view
                magpie.findNextView();
            };

            // var submitAnswer = function () {
            //     var radios = document.getElementsByName('choice');
            //     var val = "";
            //     for (var i = 0, length = radios.length; i < length; i++) {
            //         if (radios[i].checked) {
            //             val = radios[i].value;
            //             break;
            //         }
            //     }
            //
            //     if (val == "") {
            //         alert('please select choice answer');
            //     } else if (val == "2") {
            //         alert('Answer is correct !');
            //     } else {
            //         alert('Answer is wrong');
            //     }
            // };


            $("main").html(`
                        <div class='magpie-view'>
                        
                        <h1 class='magpie-view-title'>Pick the right entity</h1>
                        <div class="annotation-head"></div>
                            <div class="annotation-segment">
                            <span class="marker" data-anno-id="0"><span id="parent">This is a</span></span> 
                                <span class="marker" data-anno-id="1">sample</span> 
                                text
                                <span class="marker" data-anno-id="2">another one</span> 
                                text
                                <span class="marker" data-anno-id="3">one mooooorreee</span> 
                            </div>                            
                        </div>
                        
                        <div class="flex">
                            <button id="first" class='flex-child magpie-response-sentence'>[0] Q123</button>
                            <div id="first-sentence" class='flex-child magpie-view-text'>
                                <b><a href="https://en.wikipedia.org/wiki/David_Beckham" target="_blank">
                                    David_Beckham
                                </a></b> 
                                    is the best footballer that England ever had for a very very very very long time.
                            </div>
                        </div>
                        
                        <div class="flex">
                            <button id="second" class='flex-child magpie-response-sentence'>[1] Q234</button>
                            <div id="second-sentence" class='flex-child magpie-view-text'>
                                <b><a href="https://en.wikipedia.org/wiki/David_Mitchell" target="_blank">
                                    David_Mitchell
                                </a></b> 
                                    is the best comedian that England ever had for a very very very very long time.
                            </div>
                        </div>
                        
                        <div class="flex">
                            <button id="third" class='flex-child magpie-response-sentence'>[2] Q345</button>
                            <div id="third-sentence" class='flex-child magpie-view-text'>
                                <b><a href="https://en.wikipedia.org/wiki/David_Beckham" target="_blank">
                                    David_Beckham
                                </a></b> 
                                    is the best footballer that England ever had for a very very very very long time.
                            </div>
                        </div>
                        
                        <div class="flex">
                            <button id="second" class='flex-child magpie-response-sentence'>[1] Q234</button>
                            <div id="second-sentence" class='flex-child magpie-view-text'>
                                <b><a href="https://en.wikipedia.org/wiki/David_Mitchell" target="_blank">
                                    David_Mitchell
                                </a></b> 
                                    is the best comedian that England ever had for a very very very very long time.
                            </div>
                        </div>
                        
                        <div class="flex">
                            <button id="third" class='flex-child magpie-response-sentence'>[2] Q345</button>
                            <div id="third-sentence" class='flex-child magpie-view-text'>
                                <b><a href="https://en.wikipedia.org/wiki/David_Beckham" target="_blank">
                                    David_Beckham
                                </a></b> 
                                    is the best footballer that England ever had for a very very very very long time.
                            </div>
                        </div>
                        
                        
                        
                        `)


            $(document).ready(function () {

                var annos = ['FIRST-THING', 'second', 'third', 'forth']; // your annotation data
                const idx = 2;

                $('.marker').each(function () {
                    var $t = $(this),
                        pos = parseInt($t.attr('data-anno-id')),
                        annoStr = annos[pos];
                    var total_width = 0;
                    $('.annotation-head .anno').each(function () {
                        total_width += $(this).width();
                    })
                    // create an annotation for each marker
                    var top = this.offsetTop - 5,
                        left = this.offsetLeft - total_width,
                        width = $t.width(),
                        style = 'style="top:' + top + 'px; left:' + left + 'px;width:' + width + 'px;"';

                    if (pos == idx){
                        $('.annotation-head').append('<span class="anno label_colored" ' + style + '>' + annoStr + '</span>');
                    }
                    else {
                        $('.annotation-head').append('<span class="anno label" ' + style + '>' + annoStr + '</span>');
                    }

                });
            });


            // We will add the handle_click functions to both buttons
            $('#first').on("click", handle_click);
            $('#second').on("click", handle_click);

            // $('#mybutton').on("click", submitAnswer);

            // That's everything for this view
        }
    };
    // We have to return the view, so that it can be used in 05_views.js
    return view;
};