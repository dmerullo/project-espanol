# Description

**Project ESPAÑOL**: An **E**xploration Of **S**panish-language **P**oetry **A**nd **N**uances **O**f **L**anguage

by [Devin Merullo](https://dmerullo.github.io/)

View the application at: [http://dmerullo.pythonanywhere.com/](http://dmerullo.pythonanywhere.com/)

*Project ESPAÑOL* is an application that leverages high-throughput analysis of Spanish-language poems in the public domain to create custom lesson plans and guide discovery of new texts for practice and study. The dataset contains 10,000 classical Spanish-language poems from 200 authors covering 500 years, totaling 2.5 million words. An unsupervised clustering algorithm in Python grouped the poems into 4 difficulty levels by analyzing the frequencies of 10,000+ verb forms conjugated across 18 grammatical tenses for the 550+ most common verbs. The full texts, metadata, and grammatical statistics can be accessed in an [interactive Plotly Dash application](http://dmerullo.pythonanywhere.com/). 

I scraped the poems from [https://poesi.as/](https://poesi.as/) with the R package `rvest`. I only included poems whose authors lived before the start of World War II (1939)-- I thought this was a safe time to only include texts in the public domain, but this date may change as I learn more about copyright laws. 

In creating this project, I came across a [GitHub repository](https://github.com/linhd-postdata/poesi.as) from the [POSTDATA Project](https://postdata.linhd.uned.es/) that similarly contains classical Spanish-language poems. Although I did all of the work here independently, I want to reference this project because it predates *Project ESPAÑOL*.

# Release History

- 2024-12-21 Version 0.0: Minimum viable product! 

# Coming Soon

- Improved interface for application
- Detailed analytics on poem dataset
- Recommendation algorithm
- Incorporation of additional grammatical features for computational analysis
- Addition of more poems and authors

# Community

If you would like to support this and future projects, please [send a donation](https://buymeacoffee.com/dmerullo)!